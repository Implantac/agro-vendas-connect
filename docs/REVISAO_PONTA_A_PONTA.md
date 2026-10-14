# Revisão ponta a ponta — DDP AGRO

Data: 13/10/2026. Base: `main` em `d588ade` (origin). Revisão feita sobre o código do repositório,
sobre o banco reconstruído a partir das migrations (PostgreSQL 17) e sobre leituras **anônimas** do
projeto Supabase apontado pelo `.env`. Nenhuma escrita foi feita em produção.

Legenda de evidência: **VERIFICADO** (rodado aqui), **LEITURA** (confirmado no código), **NÃO COMPROVADO**.

---

## A. Status geral

**Não pronto para venda aberta.** O código está bem estruturado e as verificações técnicas passam
(tsc, lint sem erro, unitários, build, 7 suítes SQL do zero). O problema central é de operação:
**o banco de produção está atrás do repositório** e o conteúdo público inclui **dados de demonstração**.
Além disso, o meu push de hoje (`d588ade`) fez o `main` depender de funções que ainda não existem em
produção (ver D1).

Nota geral: **55/100**.

---

## B. Notas (0 a 100)

| # | Dimensão | Nota | Base |
|---|---|---|---|
| 1 | Segurança de acesso (RLS, RPC, service role) | 70 | Guards e `SECURITY DEFINER` com checagem; service role só em handlers de servidor. Pendências: policy de `machines` quebrada para anônimos, dedupe de visualização, 16 vulnerabilidades em dependências. |
| 2 | Integridade de negócio (propostas, pedidos, status) | 75 | Triggers recalculam valor e comissão no banco; status de anúncio controlado por trigger. Criação de proposta depende de RPC ausente em produção. |
| 3 | Pagamentos e membresia | 50 | Webhook com token em tempo constante e idempotência (bom). Gateway sem credenciais; trava de cobrança depende de coluna ausente em produção. |
| 4 | Privacidade e LGPD | 45 | Anonimização incompleta (D4). Retenção de IP e user agent justificável, mas não documentada. |
| 5 | Banco e alinhamento com produção | 30 | Produção sem 2 lotes de migrations (D1). Nenhum registro do estado aplicado. |
| 6 | Funcionalidade do frontend (build, tipos, fluxos) | 70 | tsc, lint (0 erros), build e unitários OK. Fluxos no navegador: NÃO COMPROVADO. |
| 7 | Experiência e design | 60 | Barra mobile e foco adicionados. Fontes Sora e Inter declaradas e **não carregadas** (D6). |
| 8 | Acessibilidade | 55 | Sem auditoria com ferramenta. Imagens têm `alt`, há textos para leitor de tela nos badges. |
| 9 | Performance | 55 | JS público ≈ 378 kB comprimidos, com chunk principal de 471 kB e outro de 276 kB. Sem medição no navegador. |
| 10 | Testes e verificação | 65 | Suítes SQL fortes (todas passam do zero). Unitários cobrem só helpers (17). E2E existe, mas não roda em CI e não foi executado aqui. |
| 11 | Operação e CI/CD | 60 | CI com SQL em PG17, tsc, lint e build. Sem `bun audit` nem E2E no CI. Sem processo de promoção de migrations. |
| 12 | Conteúdo em produção | 25 | 9 anúncios aprovados e públicos, todos de um vendedor de demonstração (D3). |

**Média: 55/100.**

---

## C. O que está bom

- **Autorização no banco.** Papéis em `user_roles`; `profiles` com trigger que impede o usuário de
  alterar `status` e `role` (`profiles_guard_privileges`); `listings_guard_seller` bloqueia aprovação
  direta e rejeição pelo vendedor; `orders_guard_insert` recalcula `amount`, `commission` e
  `seller_id` a partir da proposta aceita. Um pedido não pode ser criado com valor forjado pelo cliente.
- **Funções que executam ação.** As funções `SECURITY DEFINER` que o `authenticated` executa e que
  alteram dados (`admin_*`, `respond_proposal`, `set_order_status`, `update_proposal_terms`,
  `review_machine_document`, `cancel_membership_request`, `log_system_event`) verificam admin ou dono
  no corpo. As funções internas (triggers, `gateway_apply_payment`) não são executáveis por
  `authenticated` nem por `anon`. As funções auxiliares de leitura (`is_approved`, `my_member_role`,
  `shares_deal_with`) só devolvem informação do próprio chamador.
- **Service role isolada.** `client.server.ts` só é carregado dentro de handlers (`await import`).
  Nenhuma ocorrência de `SERVICE_ROLE` nos assets públicos do build (VERIFICADO). Nenhum segredo
  versionado (busca por padrões de chave: nenhum achado).
- **Webhook de pagamento.** Compara o token com `timingSafeEqual`, responde 503 sem configuração,
  é idempotente por `(provider, event_id)` e nunca confirma valor menor que o cobrado.
- **Cobrança e IA.** A cobrança usa valor e dono gravados no banco, com trava atômica contra clique
  duplo. A IA tem checagem de papel, cota de 30 gerações em 24 h e limite de tamanho de entrada.
- **Testes SQL.** As 7 suítes (`authz`, `state_machine`, `maquina_estados_emails_ficticios`,
  `ataques_adicionais`, `ciclo_pagamento`, `regressao_auditoria`, `integridade_negociacao`) passam do
  zero em PostgreSQL 17. VERIFICADO.
- **Código.** Sem `any` explícito, sem `console.log`, sem TODO, sem rotas órfãs (as 4 "sem link" são
  pais de rota dinâmica ou índices). Build, tsc e unitários passam. VERIFICADO.
- **Documentação.** README, `AUDITORIA.md` e `docs/OPERACAO.md` descrevem o estado com honestidade,
  incluindo pendências externas.

---

## D. O que está errado

### D1. Produção está atrás do repositório (CRÍTICO, bloqueante)
Sondagem somente leitura com a chave anônima:
- Tabelas ausentes (404): `conversation_reads`, `contact_messages`, `ai_usage_events`.
- Coluna ausente (42703): `membership_requests.checkout_started_at`.
- Funções ausentes (PGRST202): `create_proposal`, `set_listing_cover`, `conversation_last_messages`,
  `mark_conversation_read`, `is_public_listing_photo`.
- Presentes e restritas (42501): funções de migrations de 2026-09 (`respond_proposal`,
  `set_order_status`, `review_machine_document`, `admin_review_membership`, `update_proposal_terms`,
  `register_listing_view`, `log_system_event`).

Conclusão: produção aplicou até as migrations de setembro. **Não aplicou** `20261009100000` a
`20261010130000` (2 lotes de auditoria). Como o PostgREST não reporta versões, a conclusão vem da
combinação dos sinais, não de uma tabela de histórico. VERIFICADO por sondagem; o histórico exato de
migrations em produção NÃO COMPROVADO.

**Impacto:**
- **Meu push de hoje:** no `d675eb3`, a criação de proposta usava insert direto. No `d588ade`, usa
  `create_proposal`, que não existe em produção. Se o Lovable publicar o `main` sem as migrations, a
  **criação de propostas quebra**. A prévia de mensagens (`conversation_last_messages`) e a capa de
  foto (`set_listing_cover`) também quebram. Isso é regressão causada pelo meu push.
- **Antes do meu push:** contato (`contact_messages`), IA (`ai_usage_events`) e checkout da
  membresia (`checkout_started_at`) já dependiam de objetos ausentes em produção.

### D2. Visitante sem login não abre o detalhe do anúncio (CRÍTICO)
A policy `machines_public_read` chama `is_admin()`, e `anon` não tem EXECUTE. Em produção, a consulta
anônima ao anúncio com o join de `machines` retorna `42501`. Corrigido no repositório pela migration
`20261010130000`, mas **ainda não aplicado em produção** (confirmado por nova leitura anônima).

### D3. Dados de demonstração e lixo públicos em produção (CRÍTICO)
Leitura anônima: **9 anúncios aprovados e visíveis**, todos do vendedor `5c3d75a7…` ("DDP AGRO Store").
- 8 com slug `-demo` (ex.: "Trator John Deere 6140J 4x4 cabinado", "Colheitadeira John Deere S670").
- 1 com título "Gjjvbb" e slug `gjjvbb-ijze8b`, sem slug `-demo`. Parece teste. A migration
  `20261009100300` não o cobre.

A migration `20261009100300` já prevê a remoção (anúncios `-demo` sem pedido nem proposta), mas não
foi aplicada. Antes de apagar, confirmar que não há pedido nem proposta ligados (não visível com a
chave anônima).

O perfil `DDP AGRO Store` ("DDP AGRO Comercio de Maquinas LTDA") também está público. O `AUDITORIA.md`
já pede confirmação se esse cadastro é real.

### D4. Anonimização (LGPD) incompleta (ALTO)
`adminAnonymizeUser` cobre `profiles`, `seller_profiles`, `user_roles`, `favorites`, `saved_searches`
e `notifications`. Não cobre (LEITURA):
- **Anúncios do titular continuam aprovados e públicos** (a RLS de leitura só olha `status`).
- **`machine_documents`** (`file_path`, `file_name`): documentos privados da máquina seguem no storage.
- **`member_documents`** (`storage_path`): documentos de membro seguem no storage.
- **`messages.content`** e **`proposals.message`**: texto pessoal fica nas conversas.

Retenção de `legal_acceptances` (IP, user agent) e de registros financeiros pode ser justificada, mas
precisa estar documentada com base legal.

### D5. Vulnerabilidades em dependências (ALTO)
`bun audit`: 16 vulnerabilidades (2 críticas, 12 altas, 2 moderadas). VERIFICADO.
- **Críticas:** `seroval` 1.5.6 (usado na serialização do TanStack Start, ou seja, no caminho de
  runtime) e `shell-quote` 1.10.0 (dev, via `@tanstack/devtools-vite`).
- **Altas:** `js-yaml`, `nanoid`, `source-map-js` e outras. A maioria é de ferramentas de build.

Não atualizei dependências nesta revisão. Atualização de `@tanstack/*` precisa de teste no navegador.

### D6. Fontes do design não são carregadas (MÉDIO)
`styles.css` define `--font-display: "Sora"` e `--font-sans: "Inter"`. Não há `@font-face`,
`@fontsource`, `@import` nem link para Google Fonts no projeto (LEITURA). O navegador usa a fonte padrão
do sistema, o que contradiz o design system declarado no roadmap.

### D7. Pontos de hardening menores (BAIXO)
- `log_system_event` tem **duas sobrecargas** (4 e 5 argumentos) em produção e no repositório. O app usa
  a de 5 argumentos (sem ambiguidade), mas a de 4 deve ser removida.
- `is_public_listing_photo('')` retorna `true` se houver qualquer foto aprovada (`position('' IN url)`).
- `register_listing_view`: visitante anônimo não passa pela deduplicação. Usuário autenticado pode
  inflar o contador com várias contas.
- Mínimo de 8 caracteres de senha só existe no HTML (`minLength`). A política do Auth do Supabase não
  está no `config.toml` (NÃO COMPROVADO).
- URLs assinadas de fotos com validade de **5 anos**, gravadas no banco e entregues ao público
  (VERIFICADO no token). Já registrado como B2-23 na auditoria; decisão pendente.

---

## E. O que falta

1. Aplicar em produção as migrations `20261009100000` a `20261010130000`, em ordem, com backup e
   verificação (ver G, fase 0).
2. Remover os 9 anúncios de demonstração e teste (D3), após conferir pedidos e propostas.
3. Completar a anonimização (D4) ou documentar a decisão de retenção de cada item.
4. Carregar as fontes do design (D6).
5. Atualizar dependências com vulnerabilidade crítica e alta, com teste de regressão no navegador.
6. Rodar o E2E (`tests/e2e/run_e2e.py`) contra um ambiente de teste. Hoje não roda em CI e precisa de conta
   de admin. Atenção: ele cria anúncios reais, então **não deve apontar para produção**.
7. Medir desempenho e acessibilidade no navegador (Lighthouse ou axe). NÃO COMPROVADO.
8. Registrar em `docs/OPERACAO.md` o estado de cada migration em produção, para que a próxima
   publicação não dependa de memória.

---

## F. Impedimentos de venda versus melhorias posteriores

**Impedem venda (bloqueantes):**
- D1: produção sem os lotes de migrations; criação de propostas quebrada após o push de hoje.
- D2: visitante sem login não abre o anúncio (a correção está no repositório, falta aplicar).
- D3: anúncios de demonstração e lixo públicos.
- D4: anonimização que deixa documentos e anúncios de um titular expostos.
- Pagamento online indisponível: a operação atual é "pagamento a combinar" com confirmação manual pelo
  admin. Isso pode funcionar para começar, mas precisa estar explícito para o cliente.

**Melhorias posteriores:**
- D5 (dependências), exceto a crítica `seroval`, que deve entrar nos bloqueantes se o servidor
  deserializar entrada de terceiros.
- D6 (fontes), D7 (hardening), B2-23 (URLs de 5 anos), CSP (B2-25).
- E-mails transacionais (aguardam domínio de envio; `notificações por e-mail` está no roadmap).
- Duplicidade de catálogo: `/app/comprar` (logado) e `/catalogo` (público) mostram listas parecidas.
  `app.comparar`, `app.comprar` e `app.maquinas` precisam de decisão de produto.
- "Tempo médio de resposta" (exige definir o evento de resposta).
- Coordenadas exatas e mapa (roadmap).

---

## G. Plano em fases

**Fase 0 — produção (bloqueante, decisão do dono):**
1. Backup do banco de produção.
2. Aplicar `20261009100000` a `20261010130000`, em ordem. A `20261009100300` remove dados; confirmar antes.
3. Repetir a sondagem (tabelas, colunas e RPCs da seção D1) e a leitura anônima do anúncio.
4. Se não for possível aplicar agora, avaliar um commit de reversão (sem force push) para não publicar
   código que depende de objetos ausentes.

**Fase 1 — dados:** remover anúncios de demonstração e teste; confirmar o perfil "DDP AGRO Store".

**Fase 2 — privacidade:** anonimização completa (pausar anúncios, apagar documentos do storage,
decidir sobre mensagens), com teste SQL.

**Fase 3 — segurança:** atualizar `seroval` e demais dependências críticas e altas (com teste no
navegador); dedupe anônimo em `register_listing_view`; remover a sobrecarga de 4 argumentos; corrigir
`is_public_listing_photo('')`; decidir B2-23.

**Fase 4 — experiência:** fontes do design; E2E em ambiente de teste; auditoria de acessibilidade e
desempenho no navegador; divisão de chunks se o Lighthouse confirmar o problema.

**Fase 5 — operação:** `bun audit` e E2E no CI; registro de migrations aplicadas em produção.

---

## Perguntas finais

1. Você consegue aplicar as migrations no Supabase de produção (SQL editor do Lovable Cloud), ou quer que
   eu aplique com um banco de produção dedicado? Nesse caso, preciso de uma credencial de conexão, que
   não guardo em arquivo.
2. A `20261009100300` pode remover os 9 anúncios atuais de demonstração e teste?
3. O token do GitHub foi colado neste chat. Recomendo revogá-lo e gerar outro.

---

## Atualização (13/10/2026, após sincronizar com o remoto)

O `origin/main` recebeu 14 commits do bot da Lovable (`gpt-engineer-app[bot]`) depois de `d588ade`.
Esta seção registra o que mudou. Os achados acima foram mantidos como estavam na revisão original.

**Mudanças do remoto relevantes:**
- Migrations passaram a ser gerenciadas com Drizzle em `drizzle/migrations/` (`0000` a `0004`). O
  `drizzle.config.ts` usa `LOVABLE_DB_MIGRATION_URL`, ou seja, a Lovable aplica essas migrations.
- `supabase/migrations/20261009100300_auditoria_remove_demo_e_flag_pagamento.sql` foi **removida** do
  repositório. O conteúdo não está em `drizzle/` (conferido com `grep`). A remoção dos dados de
  demonstração **não tem mais migration versionada**.
- O conjunto `drizzle/` replica as migrations `supabase/migrations/20261009*` e `20261010*`. Agora há
  duas fontes paralelas de migrations.

**Estado de produção após a mudança (sondagem anônima, somente leitura):**

| Item | Antes | Agora |
|---|---|---|
| `conversation_reads`, `ai_usage_events` | ausentes (404) | existem (401: sem permissão para anônimo) |
| `contact_messages` | ausente (404) | existe (200) |
| `membership_requests.checkout_started_at` | ausente (42703) | existe (200) |
| RPCs `create_proposal`, `mark_conversation_read`, `set_listing_cover`, `conversation_last_messages` | ausentes (PGRST202) | existem (42501: anônimo sem EXECUTE, como esperado) |
| Leitura anônima do anúncio com `machines(...)` | falha (42501) | **funciona** (D2 resolvido em produção) |
| Anúncios aprovados e públicos de demonstração | 9 | **9 (sem alteração)** |

**Status dos achados:**
- **D1 (produção atrás do repositório): resolvido.** As migrations `0000` a `0004` estão aplicadas, pelo
  menos no que foi sondado. A sondagem não verifica o histórico completo.
- **D2 (anônimo não abre o anúncio): resolvido em produção.**
- **D3 (anúncios de demonstração públicos): aberto e agora mais urgente.** A migration de remoção foi
  apagada do repositório, então não há mais caminho versionado para remover esses dados.
- **D4 (anonimização incompleta): aberto.** Continua valendo: anúncios do titular, documentos no storage,
  mensagens e textos de proposta.
- **D5 (dependências): aberto.** O `package.json` do remoto atualizou versões de `@tanstack/*` e
  `@lovable.dev/vite-tanstack-config`. Não reavaliei os 16 achados do `bun audit` depois dessa mudança.
- **D6 (fontes): aberto.** Não verifiquei se o remoto mudou `styles.css` nesse ponto.
- **D7 (hardening): aberto.**

**Notas revisadas:** Banco e alinhamento com produção, de 30 para 65 (objetos presentes, mas duas fontes
de migrations e remoção de dados sem migration). Nota média recalculada: **58/100**.

**Ações novas:**
1. Recriar a remoção dos dados de demonstração como migration versionada (Drizzle ou `supabase/migrations`,
   escolher uma fonte). Antes de executar, conferir pedidos e propostas ligados aos 9 anúncios.
2. Escolher uma fonte única de migrations e remover a outra, para evitar divergência.
3. Confirmar com a Lovable como as migrations de `drizzle/` são aplicadas e se a `supabase/migrations/`
   é ignorada.

**Verificação do remoto `8e9608e` (com as dependências novas do bot):**
- `tsc --noEmit`: OK.
- `bun test tests/unit`: 17 pass, 0 fail.
- `bun run build`: OK.
- `bun run lint`: **FALHA**, 1579 erros, todos `prettier/prettier` exceto um `prefer-const`.
  - `src/integrations/supabase/types.ts`: 1555 erros (arquivo regenerado sem formatação).
  - `src/integrations/supabase/previewAuthStorage.ts`: 24 erros (aspas simples e quebras de linha).
  - O job `app` do CI roda `lint`. Por isso o CI do `main` remoto tende a falhar. NÃO COMPROVADO no GitHub Actions, porque não consultei a execução.
  - Em `d588ade` o lint passava (0 erros, 8 avisos).
- Correção sugerida: `prettier --write` nesses dois arquivos e tratar o `prefer-const`. Não aplicada, porque
  `types.ts` é regenerado pela Lovable e uma formatação manual pode ser desfeita na próxima sincronização.
  Decisão do usuário: formatar agora ou ajustar o gerador.

**Decisões do usuário (13/10/2026):**
- Confirmado que as migrations do repositório estão aplicadas no banco de produção.
- A migration `20261009100300_auditoria_remove_demo_e_flag_pagamento.sql` **não será aplicada, de propósito**.
  Conteúdo verificado em `d588ade`: apaga os 8 anúncios `-demo`, máquinas e perfis de demonstração
  (linhas 26 a 56) e grava `app_settings.payments_enabled = {"enabled": false}` (linhas 61 a 64).
  O usuário decidiu manter os anúncios e não desligar o pagamento. D3 passa a **decisão tomada**, com risco
  de produto: os anúncios de demonstração continuam públicos. O anúncio "Gjjvbb" não tem slug `-demo`
  e não seria removido de qualquer forma.

**Achado novo (leitura anônima de `app_settings`, somente leitura):**
- Em produção, `app_settings.payments_enabled` = `{"enabled": true, "provider": "asaas"}`.
- O README (seção de pagamento) diz "pagamento online desabilitado". **Isso não confere com produção.**
- Com a flag ligada, o checkout de membresia e a cobrança via Asaas estão ativos. Se `ASAAS_API_KEY` e
  `PAYMENT_WEBHOOK_SECRET` estão configurados no ambiente de produção: NÃO COMPROVADO.
- Ação: corrigir o README para refletir a flag real, ou desligar a flag. Decisão do usuário.

**Pendências abertas:**
- Lint do remoto (ver seção anterior): decisão de formatação ainda não tomada.
- Push: aguardando novo envio do token. O commit local está pronto como fast-forward sobre `origin/main`
  (`8e9608e`).
