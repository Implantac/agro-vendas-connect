#!/usr/bin/env bash
# Suítes SQL do banco: aplica o stub Supabase, todas as migrations em ordem e roda as suítes.
#
# Uso:
#   DATABASE_URL=postgresql://... bash tests/sql/run.sh   # banco vazio dedicado (CI)
#   bash tests/sql/run.sh                                 # local: cria ddp_test via sudo -u postgres
#
# Falha (código 1) se psql terminar com erro ou se alguma suíte reportar FAIL / FALHA / ERROR
# ou um resultado booleano falso. O banco de teste nunca deve ser produção.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SQL_DIR="$ROOT/tests/sql"
MIG_DIR="$ROOT/supabase/migrations"
LOG_DIR="${LOG_DIR:-${TMPDIR:-/tmp}/ddp-sql-tests}"
mkdir -p "$LOG_DIR"

if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL=(psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1)
else
  # Modo local: recria o banco ddp_test como superusuário do Postgres.
  sudo -n -u postgres psql -X -q -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ddp_test;" -c "CREATE DATABASE ddp_test;"
  PSQL=(sudo -n -u postgres psql -d ddp_test -X -q -v ON_ERROR_STOP=1)
fi

# Executa um arquivo SQL via stdin (evita problemas de permissão com o usuário postgres).
# Migrations rodam numa transação única (-1). Suítes controlam o próprio BEGIN/ROLLBACK.
run_file() { "${PSQL[@]}" < "$1"; }
run_migration() { "${PSQL[@]}" -1 < "$1"; }
run_sql() { "${PSQL[@]}" -c "$1"; }

echo "== Fixtures"
"${PSQL[@]}" < "$SQL_DIR/fixtures/00_stub_supabase.sql"

echo "== Migrations ($(ls "$MIG_DIR"/*.sql | wc -l) arquivos, em ordem)"
while IFS= read -r f; do
  base="$(basename "$f")"
  # Em produção o vendedor do bloco -demo já existe antes da migration 20260918210403.
  if [[ "$base" == 20260918210403_* ]]; then
    run_sql "INSERT INTO auth.users (id,email) VALUES ('5c3d75a7-f724-44d2-805a-7059a1875b30','vendedor-demo-prod@example.invalid') ON CONFLICT DO NOTHING;"
  fi
  if ! run_migration "$f" > "$LOG_DIR/migration_${base}.log" 2>&1; then
    echo "FALHA na migration $base"; cat "$LOG_DIR/migration_${base}.log"; exit 1
  fi
done < <(ls "$MIG_DIR"/*.sql | LC_ALL=C sort)

echo "== Contas de teste"
"${PSQL[@]}" < "$SQL_DIR/fixtures/02_contas_teste.sql"

SUITES=(
  authz_tests.sql
  state_machine_tests.sql
  maquina_estados_emails_ficticios.sql
  ataques_adicionais.sql
  ciclo_pagamento.sql
  regressao_auditoria.sql
)

# Padrões de falha nas saídas das suítes: linhas FAIL/FALHA, erros do psql e células booleanas "f".
FAIL_PATTERN='\bFAIL\b|\bFALHA\b|^ERROR|\| f +\|'
status=0
for suite in "${SUITES[@]}"; do
  out="$LOG_DIR/${suite%.sql}.out"
  echo "== $suite"
  if ! run_file "$SQL_DIR/$suite" > "$out" 2>&1; then
    cat "$out"; echo "ERRO: psql falhou em $suite"; status=1; continue
  fi
  if grep -E "$FAIL_PATTERN" "$out" > /dev/null; then
    grep -E "$FAIL_PATTERN" "$out" || true
    echo "FALHOU: $suite"; status=1
  else
    echo "ok ($(grep -cE '\bPASS\b|\bbloqueado\b|\bok\b|\| t +\|' "$out") linhas de resultado)"
  fi
done

if [[ $status -eq 0 ]]; then echo "TODAS AS SUÍTES PASSARAM"; else echo "HÁ SUÍTES COM FALHA"; fi
exit $status
