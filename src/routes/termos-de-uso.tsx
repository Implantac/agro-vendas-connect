import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | DDP AGRO" },
      {
        name: "description",
        content:
          "Termos de uso da plataforma DDP AGRO: elegibilidade, responsabilidades das partes e regras de conduta.",
      },
      { property: "og:title", content: "Termos de Uso | DDP AGRO" },
      { property: "og:description", content: "Regras de uso da plataforma DDP AGRO." },
    ],
  }),
  component: () => <LegalPage docType="terms" fallbackTitle="Termos de Uso" />,
});
