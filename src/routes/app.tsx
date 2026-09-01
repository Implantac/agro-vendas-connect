import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app/AppLayout";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Minha área | DDP AGRO" },
      { name: "description", content: "Dashboard operacional do membro DDP AGRO." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppLayout,
});
