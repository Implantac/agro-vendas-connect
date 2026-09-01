import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | DDP AGRO" },
      {
        name: "description",
        content:
          "Como o DDP AGRO coleta, usa e protege dados pessoais conforme a Lei Geral de Proteção de Dados.",
      },
      { property: "og:title", content: "Política de Privacidade | DDP AGRO" },
      { property: "og:description", content: "Tratamento de dados pessoais no DDP AGRO." },
    ],
  }),
  component: () => <LegalPage docType="privacy" fallbackTitle="Política de Privacidade" />,
});
