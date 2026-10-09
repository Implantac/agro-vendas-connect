# AUDITORIA.md — DDP AGRO

Fase A (somente leitura, seção 1 a 4) e Fase B (correções, seção 5). Escopo: frontend TanStack Start + React Query, backend Supabase/Postgres com RLS, RPCs e triggers.
A seção 1 é o registro original da Fase A. O status atual de cada item está na seção 5.

## Panorama

- 48 rotas em `src/routes`, com áreas pública (`/`, `/catalogo`, legais) e logada (`/app/*`), incluindo shell de admin.
- 28 tabelas em `public`, todas com RLS habilitada e ao menos uma policy; guardas por trigger e RPCs transacionais já existem para propostas, pedidos, anúncios e auditoria.
- Não há rotas de API pública (`src/routes/api/**` inexistente) — logo, não há webhook de pagamento.

## 1. Problemas encontrados

| ID | Sev. | Descrição | Evidência | Impacto | Ação recomendada |
|----|------|-----------|-----------|---------|------------------|
| A-01 | P0 | `.env` está versionado e `.gitignore` não o ignora | `git ls-files` retorna `.env`; `.gitignore` sem regra `.env` | Qualquer chave futura vaza no repositório; hoje contém apenas chaves publicáveis, mas o risco é estrutural | Adicionar `.env*` (exceto `.env.example`) ao `.gitignore` e remover do índice |
| A-02 | P0 | Pagamento de membresia é simulado e confirmado pelo próprio usuário | `src/routes/membresia.tsx:272` ("Já efetuei o pagamento") → `confirmMembershipPayment` → RPC `confirm_membership_payment`; referência Pix gerada no cliente (`membership-queries.ts:76 pixReference()`) | Usuário marca pagamento sem pagar; receita e aprovação baseadas em dado não verificado (viola princípio "proibido funcionalidade fake") | Integrar gateway real (flag `payments_enabled`/`asaas` já prevista na migration inicial), confirmar apenas via webhook |
| A-03 | P0 | Não existe webhook financeiro nem idempotência | Ausência de `src/routes/api/public/*`; `payments` só tem policy de leitura | Sem confirmação confiável de pagamento; risco de duplicidade quando o gateway entrar | Criar rota pública com validação de assinatura, chave de idempotência, evento de pagamento e atualização transacional do pedido |
| A-04 | P0 | `privacy_requests` aceita INSERT de `public` com `WITH CHECK true` | `pg_policies`: `privacy_requests_insert`, roles `{public}`, check `true` | Terceiro pode registrar solicitação LGPD em nome de outro `user_id`/e-mail (fraude/negação de serviço no processo) | Restringir a `auth.uid() = user_id` (ou canal público sem `user_id`, via RPC validada) |
| A-05 | P0 | LGPD existe como registro, não como processo | `PrivacyRequestsCard.tsx` (insere pedido), `privacy_requests_admin_update` | Sem prazo, responsável, evidência, exportação real de dados nem histórico — obrigação legal não cumprida ponta a ponta | Definir SLA, estados, responsável, log de atendimento e exportação/anonimização efetivas |
| A-06 | P0 | `orders` permite UPDATE direto por comprador/vendedor | policy `orders_parties_update` (USING/CHECK = partes ou admin) | Ainda que triggers protejam campos financeiros, a superfície permite alteração de estado fora de RPC | Fechar UPDATE para as partes e mover transições para RPCs de estado; testar transições inválidas (ex.: `CANCELLED → PAID`) |
| A-07 | P0 | Sem observabilidade | Nenhuma integração de Sentry/logs estruturados no repositório | Falhas de pagamento, RPC e webhook passam despercebidas em produção | Instrumentar erros de frontend e servidor, logs estruturados e alerta de falha financeira |
| A-08 | P0 | Cobertura de testes insuficiente para o modelo de risco | Apenas `tests/e2e/run_e2e.py`; sem testes de autorização, de máquina de estados nem Golden Path até pagamento | Regressões de segurança e de estado só aparecem em produção | Criar suíte de ataques deliberados (seção 4.1/8.2), testes de histórico de proposta e Golden Path completo |
| A-09 | P1 | `app_settings` legível por qualquer autenticado (`SELECT true`) | `pg_policies`: `app_settings_read` | Expõe parâmetros operacionais (ex.: comissão, flags) a todos os membros | Expor apenas chaves públicas por whitelist/view |
| A-10 | P1 | `listing_price_history` legível por qualquer autenticado | `pg_policies`: `listing_price_history_read` USING `true` | Concorrente vê histórico de preço de todos os vendedores | Limitar a dono, admin e (se for produto) ao anúncio publicamente relevante |
| A-11 | P1 | Máquina (EQUIPMENT) não é separada de anúncio (LISTING) | Modelo atual centrado em `listings` + `listing_media`/`listing_price_history` | Impede histórico da máquina, reanúncio, documentos e inspeção — principal diferencial planejado | Evoluir incrementalmente com `equipment` + FK opcional em `listings`, com backfill |
| A-12 | P1 | Não há documentos/inspeção da máquina nem distinção verificado × declarado | Sem tabela de documentos de anúncio (`member_documents` é do usuário) | Trust Index fica sem lastro; risco de exibir confiança sem verificação | Criar documentos por máquina com status e responsável pela verificação |
| A-13 | P1 | Localização sem geodados | Filtros por UF/cidade (`BuyerFilterPanel.tsx`); sem lat/long nem raio | Sem "perto de mim", distância no card ou raio de 100/250/500 km | Adicionar coordenadas e busca por raio no banco |
| A-14 | P1 | Sem e-mail transacional | Roadmap marca pendente; nenhuma integração de envio | Usuário perde eventos críticos (proposta expirando, pagamento) | Fila de e-mails com template, tentativa, status e proteção contra reenvio |
| A-15 | P1 | Reaceite de termos quando a versão muda não existe | Roadmap: `/aceite-atualizado` pendente; `legal_acceptances` registra versão | Aceite desatualizado enfraquece valor jurídico | Bloquear ação sensível até reaceite da versão vigente |
| A-16 | P1 | Categorias e atributos sem gestão administrativa | `category_attributes` existe; sem tela de admin | Operação depende de migration para mudar domínio | Criar CRUD administrativo com validação |
| A-17 | P2 | Consultas com `select("*")` em listas | `app-queries.ts:177,194`, `orders.ts:18,53`, `queries.ts:137`, `negotiation-queries.ts:18`, `membership-queries.ts:40` | Payload maior que o necessário; risco de expor colunas novas sem intenção | Selecionar colunas explícitas nas listagens |
| A-18 | P2 | Métricas de funil calculadas por consulta ampla, sem views agregadas | `src/lib/app-queries.ts`, dashboards de vendedor/admin | Degrada com volume | Introduzir views/materialized views (`seller_listing_metrics`, `marketplace_daily_metrics`) quando houver volume |
| A-19 | P2 | Inteligência de preço, recomendação e busca em linguagem natural ausentes | Não implementado | Sem moat tecnológico | Somente após base de dados suficiente; nunca inventar valores |

## 2. Pontos já corretos (preservar)

- Papéis em tabela separada (`user_roles`) com `is_admin()`/`has_role` SECURITY DEFINER e EXECUTE revogado do público.
- Mutações críticas de negociação já em RPC transacional (`respond_proposal`, `update_proposal_terms`) com eventos e auditoria.
- Auditoria e notificações não são mais graváveis pelo cliente (RPC/trigger).
- RLS habilitada em 100% das tabelas de `public`, com grants explícitos.
- Normalização de imagens 4:3 no upload e wizard de publicação com moderação.

## 3. Nada de falso encontrado além de A-02

Verificação de "verificado", Trust Index e métricas de dashboard estão derivados de dados reais do banco; a única funcionalidade simulada identificada é a confirmação de pagamento de membresia (A-02/A-03).

## 4. Ordem sugerida para a Fase B

LOTE 1 (P0): A-01, A-04, A-06, A-02+A-03, A-05, A-07, A-08.
LOTE 2 (P1 banco/domínio): A-09, A-10, A-11, A-12, A-13.
LOTE 3 (P1 produto): A-14, A-15, A-16.
LOTE 4 (P2): A-17, A-18, A-19.


## 5. Status após a Fase B (correções)

Critério: "corrigido" significa verificado no banco (suítes SQL com ROLLBACK, rodadas do zero com `tests/sql/run.sh`) ou no código (leitura direta do arquivo). Itens que dependem de conta, domínio ou configuração externa aparecem como **pendente externo**.

| ID | Status | Evidência |
|----|--------|-----------|
| A-01 `.env` versionado | Corrigido | `.env` saiu do índice (`git rm --cached`); o arquivo local permanece e continua no `.gitignore`. O conteúdo tinha só chaves publicáveis. O arquivo continua no histórico do git. |
| A-02 pagamento de membresia confirmado pelo próprio usuário | Corrigido | Botão "Já efetuei o pagamento" removido de `membresia.tsx`. A confirmação é do admin (`admin_confirm_membership_payment`) ou do webhook. |
| A-03 webhook financeiro e idempotência | Corrigido no código; pendente externo | O webhook existe em `src/routes/api/public/webhooks/payments.ts`: token comparado em tempo constante, 503 sem segredo, RPC `gateway_apply_payment` com `(provider, event_id)` único. Testes T16 a T18 e `ciclo_pagamento.sql`. Falta a conta Asaas e o `PAYMENT_WEBHOOK_SECRET`. A flag `payments_enabled` está `false`. |
| A-04 `privacy_requests` com INSERT público | Corrigido | Policies `privacy_requests_insert_anon` (só `user_id IS NULL`) e `privacy_requests_insert_self`. Canal sem conta tem limite de 5 pedidos por e-mail em 24 h (T10). |
| A-05 LGPD como registro | Parcial | Aceite gravado no cadastro (T08, T09), exportação e anonimização pelo admin (`adminExportUserData`, `adminAnonymizeUser`), contato separado (T11). Falta: responsável operacional e SLA formal, e revisão jurídica dos termos. |
| A-06 `orders` com UPDATE direto pelas partes | Corrigido | Só `orders_admin_update` existe para UPDATE. Transições passam pelas RPCs. |
| A-07 observabilidade | Pendente | Nada implementado. Falta o DSN de monitoramento. |
| A-08 cobertura de testes | Corrigido (parcial) | 6 suítes SQL (`tests/sql`), testes unitários (`tests/unit`), CI com Postgres 17 (`.github/workflows/ci.yml`). O e2e (`tests/e2e/run_e2e.py`) exige ambiente publicado e não roda no CI. |
| A-09 `app_settings` legível por autenticados | Corrigido | Autenticado lê só `commission_percent` e `payments_enabled`. Anônimo lê só `payments_enabled`. |
| A-10 `listing_price_history` legível por todos | Corrigido | Só anúncio aprovado, dono ou admin (`listing_price_history_read`). |
| A-11 máquina separada de anúncio | Não tratado | Mudança de modelo de produto, fora do escopo desta fase. |
| A-12 documentos e inspeção da máquina | Não tratado | Produto. Depende de decisão sobre verificação. |
| A-13 geodados e raio de busca | Não tratado | Produto. |
| A-14 e-mail transacional | Pendente externo | Depende de domínio verificado e de provedor (Resend/SES). |
| A-15 reaceite de termos | Já existia | `AppLayout` bloqueia ações até o reaceite; rota `/aceite-atualizado`. Não alterado nesta fase. |
| A-16 categorias sem gestão admin | Já existia | `app.admin.categorias.tsx`. Não alterado nesta fase. |
| A-17 `select("*")` em listas | Parcial | Catálogo usa colunas explícitas (`CATALOG_LIST_SELECT`). Demais consultas ainda pendentes. |
| A-18 métricas por consulta ampla | Não tratado | P2, sem volume que justifique agora. |
| A-19 inteligência de preço e busca em linguagem natural | Não tratado | P2. Depende de base de dados. |

### Achados novos da Fase B

- **Crítico, corrigido:** `anon` e `authenticated` tinham TRUNCATE, REFERENCES e TRIGGER em tabelas de `public`. Confirmado em réplica (TRUNCATE apagou `app_settings`). Migration `20261009100000`.
- **Alto, corrigido:** o service role não conseguia alterar `status` nem `role` de perfil, porque os guards dependiam de `auth.uid()`. Migration `20261009100000`.
- **Crítico, corrigido:** dados fictícios em produção, incluindo 3 vendedores `.exemplo`, 8 anúncios `-demo` com máquinas "verificadas" sem verificação real, e anúncios "DDP AGRO Store" com descrição genérica. Migration `20261009100300`. Anúncios com pedido ou proposta nunca são apagados.
- **Alto, corrigido:** cobrança online estava ligada (`payments_enabled = true`) sem credenciais. Desligada na migration `20261009100300`.
- **Alto, corrigido:** a política de fotos listava o bucket inteiro para anônimos. Agora anônimos veem só anúncios aprovados. Migration `20261009100200`.
- **Médio, corrigido:** o "Fale conosco" gravava dúvidas comerciais na fila LGPD, que tem prazo legal. Agora essas mensagens vão para `contact_messages`.
- **Alto, corrigido:** o cadastro enviava CPF/CNPJ nos metadados de autenticação. Agora não envia.
- **Médio, corrigido:** a geração por IA não tinha cota nem limite de tamanho. Agora tem 30 gerações por 24 h (`ai_usage_events`), limite de 1 MB por imagem, timeout de 60 s e exige membro aprovado vendedor ou admin.
- **Médio, corrigido:** o catálogo filtrava categoria no navegador, depois de `limit(60)`. Agora a busca e a categoria são feitas no servidor, com paginação e teto de 500 anúncios.
- **Médio, corrigido:** `adminCreateUser` e `adminUpdateProfile` ignoravam erros. Agora revertem ou falham explicitamente.
- **Médio, corrigido:** a exclusão de usuário deixava órfãos. Substituída por anonimização (mantém pedidos e aceites por retenção obrigatória).
- **Médio, corrigido:** o `createAsaasCharge` podia gerar cobrança duplicada. Trava com `checkout_started_at` (janela de 120 s), timeout de 15 s e liberação só quando a cobrança não foi criada.
- **Baixo, corrigido:** `q.mjs` e `cron-auth.ts` sem referências foram removidos. A suíte `state_machine_tests.sql` tinha e-mails pessoais reais em comentário e dependia deles. Agora usa contas fictícias `*@example.invalid`.

### Pendências externas (não concluídas)

1. Credenciais Asaas, `PAYMENT_WEBHOOK_SECRET` e ativação de `payments_enabled` somente depois de testar o webhook em ambiente real.
2. Configuração do Supabase: redirecionamento de autenticação e configuração de storage. O bucket `seller-logos` continua com leitura pública (decisão pendente).
3. Domínio, e-mail transacional e monitoramento.
4. Confirmar em produção se os dados demo foram removidos e se a conta `vendedor-demo-prod@example.invalid` e o `seller_profiles` do admin "DDP AGRO Comercio de Maquinas LTDA" são reais ou devem sair.
5. Fotos: `uploadListingPhotos` grava URLs assinadas com validade de 5 anos. Não quebra o uso, mas é prazo longo para dado pessoal eventual.
6. Admin pode alterar `payment_status` diretamente. Risco residual: a confirmação manual precisa de comprovante fora do sistema.
7. Revisão jurídica dos termos antes do lançamento.
