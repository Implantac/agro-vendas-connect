# Plano de melhorias: DDP AGRO

Data de referência: 14/10/2026. Base: `main` após `3dd8416`. Análise de mercado completa em `ANALISE_COMPETITIVA.md` (fora do repositório).

## 1. Decisões já tomadas

| Tema                | Decisão                                                         | Situação                                                               |
| ------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Acesso do comprador | Gratuito: navegar, favoritar e propor sem assinatura            | Feito no código (local). Sem migration e sem mudança de preço no banco |
| Plano do vendedor   | Freemium: anúncios gratuitos limitados, destaque pago por tempo | Planejado (fase 2)                                                     |
| Página de anúncio   | Pública para visitante, com login só para propor ou favoritar   | **Feito nesta rodada**                                                 |
| Escopo desta rodada | Técnico e de qualidade, sem mudança de cobrança                 | Cumprido                                                               |

## 2. Feito nesta rodada

- **Qualidade (CI "Tipos, lint e build")**
  - Lint passava com 1.581 erros e fazia a pipeline de `main` falhar. Agora passa com 0 erros.
  - `src/integrations/supabase/types.ts` é gerado e saiu do lint.
  - Formatação corrigida em `previewAuthStorage.ts` e `vite.config.ts`.
- **Ficha pública do anúncio** (`src/routes/implementos.$slug.tsx`)
  - Visitante vê a ficha de anúncio aprovado, sem redirecionamento para o login.
  - Botão "Enviar proposta" some para visitante. No lugar, "Entrar para enviar proposta" (com retorno à ficha) e cadastro.
  - Consulta de confiança do vendedor só para membro logado.
  - Título e descrição da página vêm do anúncio, não mais do slug.
- **Sitemap** (`src/routes/sitemap[.]xml.ts`): inclui anúncios aprovados (até 5.000), com fallback para as páginas fixas se a consulta falhar.
- **Login** (`src/routes/entrar.tsx`): validação de e-mail e senha antes de chamar o servidor. Envio vazio não gera requisição.
- **Regra de vez na negociação** (`src/lib/permissions/negotiation.ts`, `src/routes/app.negociacao.$id.tsx`)
  - Bug encontrado nesta rodada: a interface mostrava aceitar e recusar ao comprador na proposta aberta, e marcava a vez do comprador em toda contraproposta. O banco já bloqueava, mas a tela induzia a erro.
  - Agora a interface segue a regra do banco: em aberto, só o vendedor responde; em contraproposta, responde quem não fez a última.
  - 12 testes novos em `tests/unit/negotiation.test.ts` (29 testes unitários no total).

### Evidência

| Verificação                                                                  | Resultado                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `tsc --noEmit`                                                               | OK                                                                 |
| `bun test tests/unit`                                                        | 29/29                                                              |
| `eslint .`                                                                   | 0 erros (8 avisos de `react-refresh`, não bloqueantes)             |
| `bun run build`                                                              | OK                                                                 |
| Teste de visitante no navegador (`/home/user/qa/teste_visitante_publico.py`) | 17/17                                                              |
| Escritas no backend durante o teste de visitante                             | Só `register_listing_view` (contador de visualizações, já existia) |

O teste de visitante rodou no servidor de desenvolvimento local, com leitura apenas no backend de produção.

### NÃO COMPROVADO nesta rodada

- Fluxo logado (proposta, aceite, contraproposta) na interface: não testado de ponta a ponta nesta rodada. As regras estão cobertas por teste unitário e por teste SQL.
- Produção: nada foi publicado. O domínio oficial ainda serve a versão anterior.
- Fotos de anúncio: a imagem principal não carregou no sandbox. Não investiguei se o problema é de URL ou de rede do sandbox.

### Feito na etapa seguinte (fase 1, itens 9 e 10)

- Fotos (item 9): o envio já aceita até 12 fotos por anúncio (`PhotoUploader`, padrão `max = 12`). O plano dizia 10; ficou como está. Vídeo curto: NÃO FEITO.
- Páginas de categoria e estado (item 10): `/implementos/categoria/<slug>` e `/implementos/uf/<UF>`. Só anúncios aprovados. UF minúscula redireciona para maiúscula. Página sem anúncio ou inexistente sai com `noindex`. Falha de consulta não gera `noindex`. Entram no sitemap só categorias e estados com anúncio aprovado.

### Comprador gratuito (fase 1, item 6)

- Cadastro de comprador não passa por `/membresia`. Vai para `/aguardando-aprovacao` (análise pelo admin, sem custo).
- Vendedor segue como antes: plano, pagamento e análise.
- Planos de comprador saem de `/planos`, da home e de `/membresia`. A linha `comprador_essencial` continua no banco, sem alteração.
- Comprador sem solicitação vê aviso "Sem membresia paga" em `/membresia`.
- Admin aprova comprador em Usuários, filtro Pendentes (aviso na tela de Aprovações).
- Texto de "e-mail ao aprovar" removido da tela de análise (e-mail transacional ainda não configurado).
- Evidência: `bun test tests/unit` 52/52 (8 novos em `tests/unit/buyer-access.test.ts`); `tsc` 0; `eslint .` 0 erros; `vite build` exit 0; checagem somente leitura no navegador (`/home/user/qa/verifica_comprador_gratuito.py`).
- NÃO COMPROVADO: cadastro e aprovação ponta a ponta. Exige criar conta real em produção, o que não foi feito sem autorização.

- Ainda não feito: páginas combinadas (categoria + estado, ex.: "colheitadeira em MT").
- Evidência: `tsc` 0; `bun test tests/unit` 44/44 (15 novos em `tests/unit/regions.test.ts`); `eslint .` 0 erros e 8 avisos; `vite build` exit 0; SSR local com títulos, `noindex` e redirect conferidos por HTTP; screenshot no navegador (`/home/user/qa/verifica_landing.py`). Sem escrita no banco.
- NÃO COMPROVADO: produção (depende de deploy). Imagem de exemplo `colheitadeiras.jpg` dá 404 em `/__l5e/assets-v1/` no ambiente local (F10).

## 3. Próximas fases

### Fase 0: pré-requisitos (antes de qualquer campanha)

1. Aplicar a correção de P1 em produção, com autorização explícita, e testar com as duas contas.
2. Remover ou ocultar os anúncios `-demo` e os dados de teste visíveis em produção (L3).
3. Configurar domínio de e-mail transacional e enviar notificações de proposta, aceite e pedido.
4. Conectar o gateway (Asaas) com split de comissão. Hoje a comissão é calculada e não é cobrada.
5. Conferir os webhooks e a `payments_enabled` em produção (F6 ainda não reverificado).

### Fase 1: liquidez (30 a 90 dias)

6. Comprador gratuito para navegar e propor. Remover a assinatura de R$ 149 como barreira de entrada.
7. Plano do vendedor freemium: X anúncios gratuitos; destaque pago por tempo no lugar da mensalidade fixa. Valores são hipóteses a validar.
8. Importação de estoque de revendas por planilha ou feed.
9. Até 10 fotos por anúncio, com vídeo curto (paridade com o NNEWTractor, auto-declarado).
10. Páginas de categoria e região indexáveis (ex.: "colheitadeira usada em MT").

### Fase 2: monetização

11. Comissão em faixas decrescentes com o valor da venda. Percentuais a validar com negócios reais.
12. Pagamento protegido (escrow) no pedido, com liberação após aceite.
13. Parceiros com comissão: inspeção técnica, frete, seguro e crédito rural.

### Fase 3: diferenciação

14. Dossiê da máquina como selo de confiança (histórico, laudo, documentos).
15. Índice de preço a partir de negócios fechados.
16. App nativo com push e alertas de busca salva.
17. Mapa com coordenadas exatas por anúncio.

## 4. Riscos e dependências

- Qualquer mudança de cobrança ou de acesso do comprador depende de decisão de produto e de atualização das políticas de acesso no banco (RLS). Não deve ser feita sem revisão da suíte SQL.
- Pushes para `main` sincronizam com a Lovable. Cada push precisa de autorização explícita.
- A migração de P1 existe em dois caminhos (`supabase/migrations` e `drizzle/migrations/0005`). A função usa `CREATE OR REPLACE`, então aplicar nos dois não causa dano.

## 5. Métricas

| Métrica                                          | Hipótese de partida               |
| ------------------------------------------------ | --------------------------------- |
| Anúncios aprovados reais por categoria principal | Pelo menos 20                     |
| Visitas orgânicas em páginas de anúncio          | Crescimento mensal                |
| Visita para proposta                             | Linha de base na primeira coleta  |
| Proposta para aceite                             | Linha de base                     |
| Aceite para pedido pago                          | Pelo menos 1 por semana no início |
| Retenção de vendedor em 60 dias                  | Acompanhar por plano              |
