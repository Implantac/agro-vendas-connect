# Operação — DDP AGRO

Runbook para deploy, verificação, backup, restauração, rollback e diagnóstico.
Tudo aqui foi testado em réplica local (`ddp_test`, Postgres 17 com o stub Supabase),
exceto onde está marcado como **a confirmar no ambiente publicado**.

## 1. Variáveis de ambiente

| Variável | Onde | Obrigatória | Observação |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | build (cliente) | sim | Chave publicável. Vão para o bundle. |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | servidor | sim | Usadas pelas rotas de servidor. |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | sim para admin | **Nunca** no cliente nem no repositório. |
| `PAYMENT_WEBHOOK_SECRET` | servidor | para pagamento | Sem ela, o webhook responde 503 (esperado). |
| `ASAAS_API_KEY` | servidor | para pagamento | Sem ela, a cobrança responde "não configurado". |
| `LOVABLE_API_KEY` | servidor | para IA | Geração de descrição. |

Pagamento fica desligado enquanto `app_settings.payments_enabled = false`.
Só ligue depois de testar o webhook com a conta Asaas real.

## 2. Deploy

1. Confirme que o CI está verde (`.github/workflows/ci.yml`: job `sql` e job `app`).
2. Antes de publicar uma migration que cria FKs, verifique órfãos (ver seção 6). A migration
   `20261010100000` aborta com mensagem clara se houver linhas em `orders`, `proposals` ou
   `conversations` sem perfil correspondente.
3. Publique pelo Lovable. Migrations desta fase: `20261010100000` e `20261010110000`. As migrations em `supabase/migrations/` são aplicadas pelo
   ambiente do Supabase, **na ordem do nome**. Não edite migration já publicada; crie uma nova.
4. Depois do deploy, rode o health check (seção 3) e a checagem de banco (seção 4).

## 3. Health check

```bash
curl -fsS https://<dominio>/api/public/health
# esperado: HTTP 200 e {"status":"ok","time":"..."}
```

- O endpoint responde só que a aplicação está de pé. **Não** consulta o banco.
- Use `HEAD` ou `GET` no monitoramento. A resposta não é cacheada (`no-store`).
- Para checar banco, use a checagem da seção 4 (manual ou em job com a service role).

Webhook de pagamento (`POST /api/public/webhooks/payments`):
- sem `PAYMENT_WEBHOOK_SECRET` configurado: **503** para qualquer requisição (esperado até a configuração);
- com o segredo configurado e cabeçalho `asaas-access-token` ausente ou diferente: **401**;
- nunca **200** sem o token correto.

## 4. Checagem de banco pós-deploy

Rodar no SQL Editor do Supabase (somente leitura). Esperado: zero em todas as linhas.

```sql
-- FKs sem índice na coluna (deve ser 0)
SELECT count(*) AS fk_sem_indice
FROM pg_constraint c
WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
  AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]);

-- Órfãos de parte do negócio (deve ser 0)
SELECT
  (SELECT count(*) FROM orders o WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.buyer_id)) AS orders_buyer,
  (SELECT count(*) FROM orders o WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.seller_id)) AS orders_seller,
  (SELECT count(*) FROM proposals x WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = x.buyer_id)) AS proposals_buyer;

-- Termo vigente: exatamente um por tipo
SELECT doc_type, count(*) FILTER (WHERE published) AS vigentes
FROM legal_documents GROUP BY doc_type;

-- Pagamento desligado enquanto não houver credenciais
SELECT key, value FROM app_settings WHERE key = 'payments_enabled';
```

## 5. Backup e restauração

- O banco, o storage e os backups são gerenciados pelo Lovable Cloud (Supabase).
  **A confirmar no painel:** frequência, retenção e se há Point-in-Time Recovery no plano.
- Antes de qualquer migration destrutiva, gere um backup lógico manual do banco
  (`pg_dump` com a string de conexão do painel, em ambiente seguro, nunca no repositório).
- Restauração: restaure num projeto separado primeiro, rode a checagem da seção 4 e só depois
  decida sobre o ambiente principal.
- Arquivos do storage (`listing-photos`, `machine-documents`, `seller-logos`) não entram no
  dump do banco. Faça cópia separada se a retenção for importante.

## 6. Rollback

- **Código:** volte para o commit anterior e publique. O histórico de `main` não é reescrito
  (sem force push), porque o Lovable sincroniza com ele.
- **Banco:** não há rollback automático de migration. Use correção para frente: nova migration
  que reverte o efeito. Exemplos prontos:
  - Remover o bloqueio de exclusão de anúncio:
    `DROP TRIGGER trg_listings_block_delete_with_deals ON public.listings;`
  - Remover o evento automático de pedido:
    `DROP TRIGGER trg_orders_log_created ON public.orders;`
    (e recolocar o insert do cliente em `src/lib/orders.ts`, se for reverter o código também).
  - Remover as FKs de perfil (só se um fluxo legítimo precisar apagar perfil com negociação):
    `ALTER TABLE public.orders DROP CONSTRAINT orders_buyer_id_profile_fkey;` (e as demais de
    `orders`, `proposals` e `conversations`, com nomes `<tabela>_<coluna>_profile_fkey`).
- Antes de reverter um trigger de integridade, avalie se já há dados que dependem dele.

## 7. Diagnóstico

| Sintoma | Causa provável | Ação |
| --- | --- | --- |
| "Não foi possível enviar a proposta" com "já tem uma negociação" | Regra de uma proposta aberta por comprador e anúncio | Orientar o comprador a usar a negociação existente. |
| "Este anúncio tem propostas ou pedidos" ao excluir | Trigger de integridade | Pausar ou arquivar o anúncio. Exclusão definitiva só com decisão operacional. |
| Painel do admin com números parados | Consulta de contagem falhou | Ver logs; a função `fetchAdminOverview` lança erro, não mostra zero. |
| Facetas do catálogo incompletas | Mais de 5000 anúncios aprovados | Aviso no console (`FACET_MAX_ROWS`). Corrigir com RPC de facetas no banco. |
| Webhook responde 401 | Token diferente de `PAYMENT_WEBHOOK_SECRET` | Conferir o segredo cadastrado na Asaas. |
| Webhook responde 503 | `PAYMENT_WEBHOOK_SECRET` ausente | Configurar o segredo. Comportamento esperado até lá. |
| Erro 500 com página genérica | Exceção no SSR | Ver logs do servidor; `src/server.ts` e `src/start.ts` registram o erro. |

## 8. Pendências operacionais (não resolvidas por código)

1. Monitoramento e alerta (Sentry ou equivalente): sem DSN, sem alerta.
2. Domínio e e-mail transacional.
3. Credenciais Asaas e ativação de `payments_enabled` após teste do webhook.
4. Confirmar em produção se os dados demo saíram (ver README, "Dados de demonstração").
5. Responsável e SLA para pedidos LGPD (`privacy_requests`).
6. Revisão jurídica dos termos publicados.
7. Arquivos órfãos no storage: `deleteListing` remove as fotos depois da exclusão confirmada.
   Se a remoção falhar, aparece `Fotos não removidas do armazenamento` no console do navegador.
   Verificar periodicamente objetos de `listing-photos` sem linha em `listing_media`.


## Migrations desta rodada (aplicar em produção)

- `20261010120000_melhorias_leitura_conversas.sql`: tabela `conversation_reads`, RPC `mark_conversation_read`.
- `20261010130000_corrige_leitura_anonima_machines.sql`: corrige o acesso anônimo ao detalhe do anúncio
  (policy de `machines`). Sem ela, visitantes sem login não conseguem abrir anúncios.

Validar depois de aplicar: abrir `/implementos/<slug>` numa aba anônima e ver a ficha completa.
