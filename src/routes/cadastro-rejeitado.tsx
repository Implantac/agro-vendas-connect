import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/cadastro-rejeitado")({
  head: () => ({
    meta: [
      { title: "Cadastro não aprovado | DDP AGRO" },
      {
        name: "description",
        content: "Seu pedido de membresia no DDP AGRO não foi aprovado nesta avaliação.",
      },
      { property: "og:title", content: "Cadastro não aprovado | DDP AGRO" },
      {
        property: "og:description",
        content: "Entenda os motivos e como solicitar uma nova análise.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RejectedRegistration;
});

function RejectedRegistration() {
  const { profile } = useAuth();

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <h1 className="mt-4 font-display text-3xl font-bold text-forest">Cadastro não aprovado</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Nesta avaliação não foi possível liberar seu acesso ao marketplace.
        </p>

        {profile?.rejection_reason && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Motivo informado
            </p>
            <p className="mt-1 text-sm text-forest">{profile.rejection_reason}</p>
          </div>
        )}

        <p className="mt-6 text-sm text-muted-foreground">
          Você pode corrigir as informações e solicitar uma nova análise a qualquer momento.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="bg-forest hover:bg-forest/90">
            <Link to="/contato">Solicitar nova análise</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}
