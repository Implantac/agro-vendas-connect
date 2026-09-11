# Próxima evolução: máquinas e avisos por e-mail

## Objetivo
Separar o cadastro permanente da máquina do anúncio comercial e ativar avisos por e-mail para eventos importantes, sem alterar o fluxo de pagamentos.

## O que será feito

### 1. Cadastro de máquinas separado do anúncio
- Criar um registro próprio para cada máquina/implemento, pertencente ao vendedor.
- Migrar os dados técnicos atuais dos anúncios sem perder informações, fotos, histórico ou negociações.
- Vincular cada anúncio a uma máquina e manter preço, descrição comercial, situação e moderação no anúncio.
- Adaptar criação, edição, catálogo, detalhes, “Meus anúncios”, comparador e indicadores para ler o novo vínculo.
- Permitir reutilizar uma máquina já cadastrada em um novo anúncio, sem duplicar seus dados técnicos.
- Manter compatibilidade temporária com anúncios antigos durante a transição.

### 2. Avisos por e-mail
- Criar preferências de comunicação por usuário, com e-mail ativado por padrão para eventos essenciais.
- Enviar avisos para: aprovação/rejeição de cadastro, aprovação/rejeição de anúncio, nova proposta/contraproposta, mensagem, mudança relevante no pedido e nova máquina compatível com busca salva.
- Evitar duplicidades com fila, chave idempotente, tentativas e registro de envio/erro.
- Manter os avisos internos atuais como fonte principal; falha no e-mail não bloqueará nenhuma ação.
- Adicionar controles de preferência em “Meu perfil” e acompanhamento de falhas na área administrativa.

### 3. Segurança e validação
- Aplicar permissões por proprietário e administrador nos novos registros.
- Impedir alterações diretas indevidas em fila e histórico de e-mails.
- Atualizar tipos e testes de autorização.
- Testar criação/edição/publicação, busca, negociação, alertas e renderização das telas afetadas.

## Fora deste lote
- Gateway de pagamento e webhook financeiro.
- Inteligência de preço, busca natural e recomendações automáticas.

## Detalhes técnicos
- Migração incremental com `machines`, `listings.machine_id`, preferências e fila de e-mails.
- Processamento de e-mail no servidor, compatível com a infraestrutura atual.
- Backfill transacional e leitura com fallback enquanto os registros existentes são convertidos.
