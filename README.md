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

Gerenciadas pelo Lovable Cloud, não versionar valores:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (cliente)
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (somente servidor)

## Desenvolvimento

```bash
bun install
bun run dev      # http://localhost:8080
bun run build
```

## Deploy

Publicação pelo próprio Lovable (HTTPS e domínio configuráveis nas configurações do projeto).
O banco, o storage (`listing-photos`, privado) e os backups são gerenciados pelo Lovable Cloud.

## Integrações pendentes de terceiros

| Integração | Status | O que falta |
| --- | --- | --- |
| Gateway de pagamento (Asaas/Mercado Pago) | Estrutura pronta, desligada | Conta aprovada, chaves e webhook assinado |
| E-mail transacional (Resend/SES) | Não configurado | Domínio verificado e chave |
| Monitoramento (Sentry) | Não configurado | DSN do projeto |

Nenhuma chave secreta é mantida no código. A redação jurídica final dos termos deve ser revisada
por advogado antes do lançamento comercial.
