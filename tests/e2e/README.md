# Testes ponta a ponta (E2E) — DDP AGRO

Suíte em Playwright (Python) que percorre o CRUD completo da plataforma com o app rodando.

## Como rodar

```bash
E2E_EMAIL="conta-aprovada@exemplo.com" \
E2E_PASSWORD="senha" \
python3 tests/e2e/run_e2e.py --base-url http://localhost:8080
```

A conta usada precisa estar **aprovada** e com papel **admin** (o teste também valida a fila de
moderação). O script devolve código de saída `0` quando todos os passos passam.

## Cobertura

1. Páginas públicas (home, catálogo, planos, termo de aceite, privacidade)
2. Login por e-mail e senha
3. Publicar anúncio pelo assistente de 5 etapas, com upload de foto
4. Editar anúncio existente
5. Gestão de fotos (capa/galeria)
6. Abertura de todas as telas do painel autenticado
7. Atualização dos dados da empresa
8. Aprovação do anúncio na moderação
9. Envio de proposta pela página pública do implemento
10. Aceite da proposta e geração do pedido
11. Listagem e histórico de negociações
12. Exclusão definitiva do anúncio
13. Ausência de erros de runtime no console

Os dados criados são temporários (título prefixado com `[E2E]`) e removidos ao final.
Screenshots ficam em `/tmp/browser/ddp-e2e/`.
