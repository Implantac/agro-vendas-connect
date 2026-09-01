import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, ShieldCheck, User } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | DDP AGRO" },
      { name: "description", content: "Preferências da conta, notificações e segurança." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Configuracoes,
});

const CARDS = [
  {
    icon: User,
    title: "Dados da conta",
    description: "Nome, telefone e localização usados nas negociações.",
    to: "/app/perfil" as const,
    action: "Editar perfil",
  },
  {
    icon: Bell,
    title: "Notificações",
    description: "Acompanhe propostas, mensagens e avisos da plataforma.",
    to: "/app/notificacoes" as const,
    action: "Ver notificações",
  },
  {
    icon: ShieldCheck,
    title: "Segurança e privacidade",
    description: "Boas práticas, LGPD e canais oficiais de suporte.",
    to: "/seguranca" as const,
    action: "Ver segurança",
  },
];

function Configuracoes() {
  return (
    <AppPage>
      <h1 className="text-2xl font-bold tracking-tight text-forest">Configurações</h1>
      <p className="text-sm text-muted-foreground">Gerencie preferências da sua conta DDP AGRO.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <div key={card.title} className="rounded-lg border border-border bg-card p-5">
            <card.icon className="h-5 w-5 text-accent" />
            <h2 className="mt-3 text-sm font-semibold text-forest">{card.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to={card.to}>{card.action}</Link>
            </Button>
          </div>
        ))}
      </div>
    </AppPage>
  );
}
