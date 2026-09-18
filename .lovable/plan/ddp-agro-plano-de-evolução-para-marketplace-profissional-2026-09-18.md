# DDP AGRO — Plano de evolução para marketplace profissional

Evolução incremental do projeto atual. Nada é recriado: as regras de banco, as telas e o visual continuam os mesmos, mudando só o necessário em cada etapa.

## O que já está pronto (não refazer)
- Pagamento simulado removido: ninguém mais confirma o próprio pagamento.
- Endpoint de recebimento do provedor de pagamento criado, com assinatura, proteção contra cobrança repetida e recusa de valor menor que o cobrado. Fica marcado como "aguardando configuração" até existir a credencial do provedor.
- Confirmação manual de pagamento pela administração, registrada em auditoria.
- Menus e barra inferior separados por papel (comprador, vendedor, administração).
- Separação máquina × anúncio, dossiê, verificação de documentos e selos reais.
- Permissões: só a administração vê e edita outros usuários; ninguém se promove sozinho.

## Etapas seguintes

### Etapa A — Fechar os P0 restantes
- Auditoria (LGPD): impedir solicitação em nome de terceiro; pedido só do próprio titular, com prazo, responsável, status, histórico e evidência.
- Pedidos: fechar alteração direta de status por comprador/vendedor; toda transição passa por função transacional no banco.
- Configurações internas: separar as públicas das administrativas; comissão e parâmetros financeiros só para administração.
- Histórico de preço: visível apenas ao dono da máquina e à administração.
- Erros: mensagem única ao usuário ("Não foi possível concluir esta operação", com "Tentar novamente"), e registro técnico completo no banco com categoria (auth, pagamento, membresia, anúncio, máquina, proposta, negociação, pedido, documento, LGPD, segurança, sistema).

### Etapa B — Painéis por papel
- Comprador: propostas aguardando resposta, negociações, pedidos, favoritos, buscas salvas, alertas; seções de oportunidades, favoritos, negociações, buscas salvas e máquinas próximas — tudo com dados reais e mensagem clara quando vazio.
- Vendedor: máquinas, anúncios ativos/em análise/incompletos, propostas, negociações, pedidos, interessados, documentação pendente; atalhos para cadastrar máquina, criar anúncio, ver propostas e completar documentação.
- Administração (Command Center): indicadores de membros, máquinas, anúncios, moderação, propostas, negociações, pedidos, membresias, receita, comissões, documentos, denúncias e eventos críticos; bloco "Pendências prioritárias" em que cada item abre a tela correspondente.

### Etapa C — Máquinas e anúncios
- Dossiê organizado em identificação, características por categoria, documentação (tipo, situação, data, responsável, observação, arquivo, data da verificação) e evidência, separando "informado pelo vendedor" de "verificado pelo DDP AGRO".
- Página do anúncio completa: galeria, ficha técnica, localização aproximada, vendedor, selos, situação da documentação e chamada para proposta; visitante sem acesso vê o bloqueio de membresia.

### Etapa D — Negociação e pedidos
- Tela de negociação com valor anunciado, proposta, contraproposta, validade, de quem é a vez, condições, histórico e conversa.
- Linha do tempo com criação, contraproposta, aceite, recusa, expiração, mudança de termos e geração do pedido.
- Testes das transições inválidas (por exemplo, cancelado virando pago).

### Etapa E — Localização e filtros
- Coordenadas por máquina, distância aproximada e ordenação por proximidade, sem expor endereço exato.
- "Máquinas próximas de você" com 50, 100, 250, 500 km e todo o Brasil.
- Filtros específicos por categoria (trator, colheitadeira, plantadeira, pulverizador), escondendo atributos irrelevantes.

### Etapa F — Membresia e e-mail
- Cobrança real assim que a credencial do provedor existir; enquanto isso, "Pagamento online indisponível no momento".
- Fila de e-mails com situação (pendente, enviado, falhou, repetindo) e um envio por evento; sem provedor configurado, nada é enviado nem simulado.

### Etapa G — Desempenho, mobile e testes
- Listagens com campos selecionados e paginação (catálogo, máquinas, propostas, pedidos, auditoria, membros, mensagens).
- Revisão de todos os fluxos no celular, com filtros em gaveta e alvos de toque adequados.
- Testes de autorização, negociação, pedido, pagamento e máquina; verificação de tipos, lint e build.

## Estrutura futura (só quando houver dados)
Busca em linguagem natural, recomendações e índice de confiança ficam preparados, mas só entram no ar com base real de dados. Sem dados: "Estamos aprendendo suas preferências."

## Pendências externas
- Credencial do provedor de pagamento (cobrança real).
- Credencial do provedor de e-mail (envio real).

## Detalhes técnicos
- Migrations novas para: política de LGPD por titular, RPCs de transição de pedido, separação de chaves públicas/administrativas em `app_settings`, coordenadas em `machines`/`listings`, fila `email_events`, categorias em `system_events`.
- Nenhuma regra crítica sai do banco para o frontend; RLS e RPCs continuam sendo a fonte de autorização.
- Tudo em TanStack Start + Query, Tailwind e design system atual; sem novo shell, sem dados fictícios.
