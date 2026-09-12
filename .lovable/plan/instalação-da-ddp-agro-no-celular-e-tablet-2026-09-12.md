# Instalação da DDP AGRO no celular e tablet

## Objetivo
Transformar o site em um aplicativo instalável e mostrar a opção de instalação em celulares e tablets compatíveis.

## Implementação
- Adicionar o manifesto do aplicativo com nome, cores, ícones e abertura em modo independente.
- Registrar um service worker básico para habilitar a instalação com segurança, sem alterar os fluxos atuais.
- Criar um aviso de instalação adaptado ao aparelho:
  - Android e navegadores compatíveis: botão **Instalar** abre a instalação nativa.
  - iPhone/iPad: orientação curta para usar **Compartilhar > Adicionar à Tela de Início**.
  - Ocultar quando o aplicativo já estiver instalado ou após o usuário dispensar.
- Exibir o aviso tanto no site público quanto na área de membros, somente em telas móveis/tablets.

## Validação
- Confirmar manifesto, service worker e ícones no navegador.
- Testar o aviso em tamanhos de celular e tablet e garantir que não cubra a navegação.
