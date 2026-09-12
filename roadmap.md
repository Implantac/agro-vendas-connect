# DDP AGRO — Roadmap

## Fase 0 — Fundação
- [x] Ativar Lovable Cloud (auth, DB, storage)
- [x] Design system exclusivo (paleta verde mata/campo, argila, areia; Sora/Manrope + Inter)
- [x] Logo, símbolo, favicon

## Fase 1 — Público
- [x] Landing /
- [x] /catalogo com filtros e busca
- [x] /implementos/:slug
- [x] /como-funciona, /seguranca, /contato, /central-de-ajuda
- [x] Páginas legais (termos, privacidade, cookies)

## Fase 2 — Auth e aprovação
- [x] /cadastro (comprador/vendedor) e /entrar (e-mail + Google)
- [x] Recuperação de senha (/recuperar-senha e /redefinir-senha)
- [x] Perfis, papéis em tabela separada, status de aprovação (banco + painel /app)
- [x] /aguardando-aprovacao, /cadastro-rejeitado
- [x] /aceite-atualizado (reaceite quando o termo muda de versão)
- [x] Termos versionados + registro de aceite no cadastro

## Fase 3 — Anúncios
- [x] CRUD de anúncios do vendedor + upload de fotos (padronizadas 4:3)
- [x] Fluxo de moderação (rascunho > análise > aprovado/rejeitado)
- [x] Favoritos
- [x] Cadastro permanente de máquinas separado do anúncio, com vínculo e reaproveitamento no novo anúncio
- [x] Tela "Minhas máquinas" (/app/maquinas): cadastrar, editar, excluir e ver anúncios vinculados
- [x] Dossiê da máquina: documentos/laudos privados + histórico próprio reaproveitado em todos os anúncios
- [x] Verificação real de documentos pela equipe (/app/admin/verificacoes) — selo "Documentação verificada" x "informado pelo vendedor"
- [x] Localização por distância: "~X km de você", raio de busca e ordenação por proximidade (aprox. por UF)
- [ ] Coordenadas exatas por anúncio + mapa interativo
- [ ] Inteligência de preço, busca em linguagem natural e recomendações
- [ ] Documentação de operação e relatório final consolidado

## Fase 4 — Negociação
- [x] Propostas e contrapropostas (validade 48h, RPC transacional)
- [x] Pedidos com comissão automática
- [x] Chat entre partes autorizadas (realtime)
- [x] Notificações in-app
- [ ] Notificações por e-mail (bloqueado até configurar um domínio de envio próprio)

## Fase 5 — Admin
- [x] Dashboard consolidado, membros (criar/editar/senha), moderação, pedidos, denúncias, auditoria, financeiro, membresias
- [x] Gestão de categorias pela tela (/app/admin/categorias)
- [x] Gestão de termos/versões pela tela (/app/admin/termos)
- [x] Tela de atendimento LGPD com prazo e exportação (/app/admin/privacidade)

## Fase 6 — Pagamentos e produção
- [ ] Estrutura de gateway (Asaas) com feature flag — hoje pagamento é simulado
- [ ] Webhook assinado de pagamento/assinatura
- [x] Busca salva com alertas (in-app)
- [x] Pipeline de leads por etapa (derivado de eventos reais; sem etapas manuais por decisão de produto)
- [ ] Documentação final de operação

## Área logada (concluído)
- [x] Layout logado: header fixo, busca global, notificações, sidebar agrupada, bottom nav mobile
- [x] Dashboard: resumo, oportunidades, categorias, negociações, atividade, segurança
- [x] Comprar (catálogo interno com filtros), Negociações, Propostas (aceitar/recusar/contraproposta)
- [x] Favoritos, Meus anúncios (pausar/reativar/excluir), Publicar (wizard 5 passos → in_review)
- [x] Mensagens com realtime, Notificações, Perfil editável

## Reorganização por papel (Sprint 1 — concluído)
- [x] Três shells separados: Comprador, Vendedor e Admin (navegação e bottom nav próprios)
- [x] Remoção do toggle global "Comprar | Vender"; modo derivado do papel
- [x] Guards por papel (rotas de vendedor, comprador e /app/admin/*)
- [x] Admin Shell: Command Center, Membros, Anúncios (moderação), Auditoria
- [ ] Sprint 2 Comprador / 3 Vendedor / 4 Admin avançado / 5 Negociação unificada / 6 Membership
- [x] Sprint 5 — Negociação unificada em /app/negociacao/:id (proposta + contraproposta + chat + histórico auditável)
- [x] Sprint 6 — Membresia: /aguardando-aprovacao, /cadastro-rejeitado, guard por status e CTA "Solicitar membresia" no login
- [x] Membresia completa: /planos, /membresia (pagamento Pix/boleto/cartão simulado), análise e aprovação em /app/admin/membresias + tela de Membros atualizada
- [x] Regra da plataforma: anúncios apenas usados/seminovos (wizard e filtros)

## Evolução marketplace (concluído)
- [x] Guardas no banco: dono/role/status imutáveis por usuário comum; proposta/pedido validados no banco
- [x] Página do anúncio: galeria, código, resumo comercial, ficha técnica, selos de confiança reais
- [x] Índice de completude do anúncio (edição)
- [x] Minhas máquinas (listas, histórico de preço, disponibilidade) + Comparador (/app/comparar)
- [x] Funil do vendedor por máquina; interessados sempre vinculados a anúncio
- [x] Negociação: linha do tempo, validade 48h, vez de quem, condições comerciais estruturadas
- [x] Command Center: saúde do marketplace (30 dias) com sinais acionáveis
- [x] .env.example; .env contém apenas chaves publicáveis (sem service role)
- [ ] Segunda conta de teste (comprador) para E2E da proposta ponta a ponta

## Fase B — Lote 1 (P0)
- [x] A-01 `.env` fora do controle de versão (.gitignore)
- [x] A-04 Solicitação LGPD só em nome do próprio titular
- [x] A-06 Pedido: UPDATE direto fechado; transições via RPC `set_order_status`
- [ ] A-02/A-03 Gateway real + webhook assinado (bloqueado: falta credencial do provedor)
- [x] A-05 Atendimento LGPD com prazo, responsável e exportação real
- [x] A-07 Observabilidade: tabela `system_events`, RPC `log_system_event`, erros do front registrados e painel em /app/admin/auditoria com alertas financeiros
- [x] A-08 Suíte de testes de autorização (`tests/sql/authz_tests.sql`) — 12/12 ataques bloqueados (inclui máquinas)
- [x] A-08b Testes de máquina de estados com duas contas reais (`tests/sql/state_machine_tests.sql`) — 13/13 aprovados; corrigido o registro do status anterior no histórico e bloqueada resposta a proposta vencida
