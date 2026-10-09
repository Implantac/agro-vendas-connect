# DDP AGRO — Marketplace de Implementos Agrícolas

Plataforma fechada para compra, venda e negociação de tratores, colheitadeiras, plantadeiras,
pulverizadores, carretas e implementos agrícolas usados e seminovos.

## Stack

- TanStack Start (React 19 + TypeScript) com Vite 7
- Tailwind CSS v4 (tokens em `src/styles.css`)
- Lovable Cloud (PostgreSQL, Auth, Storage, RLS)
- TanStack Query para dados, Sonner para feedback

## Estrutura

- `src/routes/` — rotas públicas (landing, catálogo, institucionais, legais) e área logada `/app/*`
- `src/components/` — design system próprio, layouts público/logado e componentes de negócio
- `src/lib/` — consultas, formatação brasileira, regras de anúncio, negociação, pedidos e aceite legal
- `supabase/migrations/` — schema, RLS, funções e seeds

## Papéis e acesso

- **Visitante**: landing, vitrine limitada, categorias e páginas legais
- **Comprador aprovado**: catálogo completo, favoritos, propostas, chat, pedidos
- **Vendedor aprovado**: anúncios (rascunho → análise → aprovado), propostas recebidas, pedidos
- **Administrador**: `/app/admin/*` — membros, membresias, moderação de anúncios e auditoria

Todo o controle é aplicado no banco por RLS; papéis ficam em `public.user_roles` (nunca no perfil).

## Fluxos implementados

Cadastro com aceite legal registrado (versão, data/hora, user agent) → pagamento da membresia →
análise do administrador → aprovação → catálogo, propostas, contrapropostas, chat em tempo real,
geração de pedido após aceite e acompanhamento de status. Pagamento online permanece desabilitado
(`app_settings.payments_enabled`), operando em modo "pagamento a combinar".

## Variáveis de ambiente

O `.env` local não é versionado (use `.env.example` como modelo). Nenhum valor secreto vai para o código.

- Cliente (build): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- Servidor: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (somente servidor, nunca no cliente)
- Pagamento (pendente): `ASAAS_API_KEY`, `PAYMENT_WEBHOOK_SECRET`. Sem eles, a cobrança online responde "não configurado" e o webhook devolve 503.
- Geração de descrição por IA: `LOVABLE_API_KEY`

## Desenvolvimento

```bash
bun install
bun run dev         # http://localhost:8080
bun run build
bun run lint        # 0 erros; 8 avisos de react-refresh conhecidos
bunx tsc --noEmit
```

## Testes

```bash
bun run test:unit   # helpers puros (busca, escape CSV)
bun run test:sql    # migrations em banco novo + suítes de segurança e regressão
```

`test:sql` usa `DATABASE_URL` (banco vazio e dedicado) ou, sem essa variável, cria `ddp_test`
via `sudo -u postgres`. Ele aplica o stub Supabase (`tests/sql/fixtures/`), todas as migrations
em ordem e as contas fictícias `*@example.invalid`. Cada suíte termina com ROLLBACK.

| Suíte | O que cobre |
| --- | --- |
| `authz_tests.sql` | Isolamento entre usuários, auditoria protegida, escalada de privilégio |
| `state_machine_tests.sql` | Transições de proposta e pedido por papel |
| `maquina_estados_emails_ficticios.sql` | Máquina de estados com contas fictícias |
| `ataques_adicionais.sql` | Ataques deliberados com `anon` e `authenticated` (esperado: todos bloqueados) |
| `ciclo_pagamento.sql` | Webhook, estorno e aprovação sem pagamento |
| `regressao_auditoria.sql` | T01 a T20: TRUNCATE, guards, limpeza demo, LGPD, contato, IA, storage |

O CI (`.github/workflows/ci.yml`) roda as suítes SQL em Postgres 17 e, em outro job, `tsc`,
testes unitários, lint e build. Para o build no CI, configure as variáveis `VITE_SUPABASE_*`
em *Settings > Secrets and variables > Actions > Variables*.

Os testes E2E (`tests/e2e/run_e2e.py`, Playwright) exigem o app rodando e uma conta admin aprovada. Não rodam no CI.

## Deploy

Publicação pelo próprio Lovable (HTTPS e domínio configuráveis nas configurações do projeto).
O banco, o storage (`listing-photos`, `seller-logos` e `machine-documents`, todos privados) e os
backups são gerenciados pelo Lovable Cloud. As migrations em `supabase/migrations/` são a fonte
da estrutura do banco.

## Dados de demonstração

As migrations `20261009100300` removem os dados fictícios que as migrations anteriores semearam:
vendedores `.exemplo`, anúncios `-demo` e anúncios "DDP AGRO Store" sem descrição real. Anúncios
com pedido ou proposta nunca são apagados. A conta `vendedor-demo-prod@example.invalid` não é
removida pela migration e precisa ser confirmada em produção.

## Integrações pendentes de terceiros

| Integração | Status | O que falta |
| --- | --- | --- |
| Gateway de pagamento (Asaas) | Código pronto e testado no banco; `payments_enabled = false` | Conta aprovada, `ASAAS_API_KEY`, `PAYMENT_WEBHOOK_SECRET` e teste do webhook em ambiente real |
| Autenticação e storage do Supabase | Migrations prontas | Redirecionamentos, política de bucket de logos (`seller-logos` ainda é pública) |
| E-mail transacional (Resend/SES) | Não configurado | Domínio verificado e chave |
| Monitoramento (Sentry) | Não configurado | DSN do projeto |

Nenhuma chave secreta é mantida no código. A redação jurídica final dos termos deve ser revisada
por advogado antes do lançamento comercial.
