import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";

export const Route = createFileRoute("/politica-de-cookies")({
  head: () => ({
    meta: [
      { title: "Política de Cookies | DDP AGRO" },
      {
        name: "description",
        content: "Quais cookies o DDP AGRO utiliza e como você pode gerenciar seu consentimento.",
      },
      { property: "og:title", content: "Política de Cookies | DDP AGRO" },
      { property: "og:description", content: "Uso de cookies essenciais e opcionais no DDP AGRO." },
    ],
  }),
  component: () => <LegalPage docType="cookies" fallbackTitle="Política de Cookies" />,
});
