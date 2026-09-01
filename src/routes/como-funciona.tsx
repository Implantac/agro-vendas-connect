import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout, PageHeader } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona o DDP AGRO" },
      {
        name: "description",
        content:
          "Entenda o fluxo de cadastro, aprovação, publicação de anúncios, propostas e pedidos na plataforma DDP AGRO.",
      },
      { property: "og:title", content: "Como funciona o DDP AGRO" },
      {
        property: "og:description",
        content: "Cadastro aprovado, anúncio moderado, proposta registrada e pedido acompanhado.",
      },
    ],
  }),
  component: ComoFunciona,
});

const BUYER = [
  ["Solicite acesso", "Cadastro com dados da empresa ou pessoa física e aceite dos termos vigentes."],
  ["Aguarde a aprovação", "A equipe interna confere documentos e libera o acesso de comprador."],
  ["Explore o catálogo", "Filtre por categoria, condição, estado e faixa de preço; salve favoritos."],
  ["Envie propostas", "Negocie valores com contrapropostas registradas e chat interno."],
  ["Acompanhe o pedido", "Ao aceitar, um pedido é criado com histórico completo de eventos."],
];

const SELLER = [
  ["Cadastre-se como vendedor", "Envie documentos da revenda, concessionária ou empresa."],
  ["Passe pela verificação", "A equipe valida a habilitação comercial antes da liberação."],
  ["Publique o implemento", "Ficha técnica, fotos, condição, localização e preço."],
  ["Aguarde a moderação", "O anúncio só entra no catálogo após aprovação técnica."],
  ["Negocie e feche", "Responda propostas, envie contrapropostas e acompanhe pedidos."],
];

function Column({ title, steps }: { title: string; steps: string[][] }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold text-forest">{title}</h2>
      <ol className="mt-6 space-y-6">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-forest font-display text-sm font-bold text-primary-foreground">
              {i + 1}
            </span>
            <span>
              <span className="block font-display text-sm font-semibold text-forest">{t}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{d}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ComoFunciona() {
  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Como funciona"
        title="Uma negociação estruturada do primeiro contato ao pedido"
        description="O DDP AGRO não é um classificado. Cada etapa é registrada, moderada e auditável."
      />
      <div className="mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 md:grid-cols-2">
        <Column title="Para compradores" steps={BUYER} />
        <Column title="Para vendedores" steps={SELLER} />
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="rounded-md border border-border bg-card p-8">
          <h2 className="font-display text-lg font-semibold text-forest">
            Pagamentos pela plataforma
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            A estrutura de pagamento por gateway está preparada e é ativada por configuração da
            administração. Enquanto o pagamento online não estiver habilitado, o pedido registra
            valores, comissão e status para acompanhamento entre as partes.
          </p>
          <Button asChild className="mt-6 bg-forest hover:bg-forest/90">
            <Link to="/cadastro">Solicitar acesso</Link>
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}
