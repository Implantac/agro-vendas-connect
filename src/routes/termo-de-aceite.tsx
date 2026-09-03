import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/termo-de-aceite")({
  head: () => ({
    meta: [
      { title: "Termo de Aceite e Ciência de Riscos | DDP AGRO" },
      {
        name: "description",
        content:
          "Termo de aceite, ciência de riscos e condições de uso do DDP AGRO: natureza da plataforma, responsabilidades das partes e limites de responsabilidade.",
      },
      { property: "og:title", content: "Termo de Aceite e Ciência de Riscos | DDP AGRO" },
      {
        property: "og:description",
        content: "Condições de uso e limites de responsabilidade da plataforma DDP AGRO.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      docType="liability"
      fallbackTitle="Termo de Aceite, Ciência de Riscos e Condições de Uso"
    />
  ),
});
