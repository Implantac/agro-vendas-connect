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
- [ ] Recuperação de senha
- [x] Perfis, papéis em tabela separada, status de aprovação (banco + painel /app)
- [ ] /aguardando-aprovacao, /cadastro-rejeitado, /aceite-atualizado
- [ ] Termos versionados + registro de aceite

## Fase 3 — Anúncios
- [ ] CRUD de anúncios do vendedor + upload de fotos
- [ ] Fluxo de moderação (rascunho > análise > aprovado/rejeitado)
- [ ] Favoritos

## Fase 4 — Negociação
- [ ] Propostas e contrapropostas
- [ ] Pedidos
- [ ] Chat entre partes autorizadas
- [ ] Notificações

## Fase 5 — Admin
- [ ] Dashboard, membros, moderação, pedidos, termos, LGPD, categorias, auditoria

## Fase 6 — Pagamentos e produção
- [ ] Estrutura de gateway (Asaas) com feature flag
- [ ] Webhooks, auditoria, documentação

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
- [x] Regra da plataforma: anúncios apenas usados/seminovos (wizard e filtros)
