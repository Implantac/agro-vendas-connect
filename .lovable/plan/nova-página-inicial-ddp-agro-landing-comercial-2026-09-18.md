# Nova página inicial DDP AGRO — landing comercial

Evolução da home atual (`/`), sem recriar o projeto. Cabeçalho, rodapé, catálogo, planos, cadastro, membresia, pagamento e áreas logadas continuam os mesmos; muda a página inicial e o que falta para ligar planos e adesão de ponta a ponta.

## O que já existe (auditoria)
- Home atual: institucional (história, missão, visão, valores, contato). Sem catálogo, sem planos, sem FAQ, CTA principal levando ao site externo.
- Páginas públicas já prontas: `/catalogo`, `/como-funciona`, `/planos`, `/seguranca`, `/contato`, `/central-de-ajuda`, termos, privacidade, cookies.
- Planos reais no banco (3 ativos: Comprador Essencial, Vendedor Pro em destaque, Vendedor Premium) com nome, descrição, perfil, preço, periodicidade, benefícios, destaque, ativo e ordem.
- Adesão real já funcionando: escolher plano → cadastro/login → solicitação → cobrança com código → confirmação só pelo provedor (webhook assinado, idempotente) → análise da administração → acesso liberado. O "já efetuei o pagamento" já foi removido.
- Cabeçalho e rodapé públicos existentes, com menu e versão mobile.

## O que muda

### 1. Home reconstruída como landing (arquivo `/`)
Seções, nesta ordem:
1. **Hero**: "O marketplace privado para comprar e vender máquinas agrícolas usadas", subtítulo do pedido, botões "Explorar máquinas" e "Quero ser membro", link "Como funciona", com quatro selos de confiança (membros aprovados, anúncios moderados, negociação estruturada, informações organizadas). Imagem agrícola de alta qualidade, composição cinematográfica.
2. **Faixa de confiança**: ambiente privado · membros aprovados · anúncios moderados · negociação registrada · informações estruturadas. Sem números.
3. **Problema → solução**: "Comprar uma máquina agrícola exige mais do que encontrar um anúncio", seis pontos de dor e o contraponto do DDP AGRO.
4. **Catálogo real**: até 6 anúncios aprovados vindos do banco, com carregando / lista / vazio ("Estamos preparando o catálogo. Seja um dos primeiros membros do DDP AGRO.") / erro com "Tentar novamente". Reaproveita o card de anúncio já existente.
5. **Dossiê da máquina**: representação visual do dossiê real, separando claramente "Informado pelo vendedor" de "Verificado pelo DDP AGRO".
6. **Para quem compra** e **Para quem vende**: dois blocos com as etapas reais e CTAs que levam ao cadastro com o perfil correspondente.
7. **Como funciona**: seis passos (perfil, plano, cadastro, pagamento, análise, acesso).
8. **Planos**: cards vindos do banco (nome, descrição, perfil, preço, periodicidade, benefícios, limites, destaque) com "Escolher plano" levando ao fluxo real. Nenhum preço no código.
9. **Segurança e transparência**: só recursos existentes, sem promessas absolutas.
10. **FAQ**: as 12 perguntas pedidas, respondidas conforme o que o sistema realmente faz.
11. **CTA final**: "Sua próxima oportunidade no campo pode estar aqui."

### 2. Planos administráveis
- Acrescentar aos planos: limite de anúncios, limite de máquinas, comissão e rótulo de destaque (ex.: "Mais escolhido") — tudo configurável, nada fixo no código.
- Nova tela na administração para criar e editar planos (preço, benefícios, limites, destaque, ativo, ordem). O que o administrador alterar aparece na hora na página inicial e em `/planos`.

### 3. Adesão e pagamento
- Fluxo mantido; a página inicial passa a ser a porta de entrada dele.
- Quando o provedor de pagamento ainda não estiver configurado, a tela diz "Pagamento online aguardando configuração" — sem simulação, sem checkout falso.
- A tela de membresia ganha o resumo do plano escolhido e as etapas (plano → conta → pagamento → confirmação) mais explícitas.

### 4. Cabeçalho, rodapé, SEO e mobile
- Menu: Início · Como funciona · Catálogo · Planos · Segurança, com "Entrar" e "Seja membro" sempre visível (inclusive no celular).
- Rodapé com as áreas reais, termos, privacidade, contato e entrada.
- Título e descrição da home padronizados; imagem de compartilhamento; títulos semânticos e textos alternativos.
- Layout pensado para o celular: hero adaptado, cards empilhados, planos empilhados, botão de adesão sempre alcançável.

## Detalhes técnicos
- Uma migration: colunas `listing_limit`, `machine_limit`, `commission_percent`, `highlight_label` em `membership_plans`; RLS de leitura pública dos planos ativos mantida, escrita só para administração.
- Home dividida em componentes em `src/components/home/*` e montada em `src/routes/index.tsx`; cards de anúncio e consultas atuais reutilizados, com campos selecionados (sem `select("*")`).
- Nenhum dado fictício; todos os estados (carregando, vazio, erro com repetir) implementados nas seções de catálogo e planos.
- Ao final: verificação de tipos, conferência no navegador em desktop e celular, console sem erros.

## Pendências externas (inalteradas)
- Credencial do provedor de pagamento (Asaas).
- Domínio de envio para e-mails.
