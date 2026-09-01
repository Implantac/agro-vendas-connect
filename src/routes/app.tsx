import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Clock, ShieldAlert, CheckCircle2 } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Meu painel | DDP AGRO" },
      {
        name: "description",
        content: "Acompanhe o status da sua conta, propostas e negociações no DDP AGRO.",
      },
      { property: "og:title", content: "Meu painel | DDP AGRO" },
      { property: "og:description", content: "Painel do membro DDP AGRO." },
    ],
  }),
  component: AppPanel,
});

function AppPanel() {
  const { user, profile, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/entrar" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <PublicLayout>
        <div className="px-4 py-24 text-center text-sm text-muted-foreground">Carregando...</div>
      </PublicLayout>
    );
  }

  const status = profile?.status ?? "pending";

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Painel"
        title={`Olá, ${profile?.full_name ?? "membro"}`}
        description="Status da sua conta e acesso às áreas liberadas."
      />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-14 sm:px-6">
        {status === "pending" && (
          <div className="flex gap-4 rounded-md border-l-4 border-clay bg-secondary/60 p-6">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
            <div>
              <h2 className="font-display text-base font-semibold text-forest">
                Cadastro em análise
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sua conta está em verificação pela equipe DDP AGRO. Enquanto isso você pode navegar
                pelo catálogo, mas não pode publicar anúncios, enviar propostas ou usar o chat.
              </p>
            </div>
          </div>
        )}

        {(status === "rejected" || status === "suspended") && (
          <div className="flex gap-4 rounded-md border-l-4 border-destructive bg-destructive/5 p-6">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <h2 className="font-display text-base font-semibold text-forest">
                {status === "rejected" ? "Cadastro não aprovado" : "Conta suspensa"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {profile?.rejection_reason ??
                  "Entre em contato com a equipe para entender os próximos passos."}
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/contato">Falar com a equipe</Link>
              </Button>
            </div>
          </div>
        )}

        {status === "approved" && (
          <div className="flex gap-4 rounded-md border-l-4 border-accent bg-secondary/60 p-6">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <h2 className="font-display text-base font-semibold text-forest">
                Conta aprovada como {profile?.role === "seller" ? "vendedor" : "comprador"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Você já pode negociar dentro da plataforma.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-6">
            <h3 className="font-display text-sm font-semibold text-forest">Dados da conta</h3>
            <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
              <div>E-mail: {profile?.email ?? user.email}</div>
              <div>Perfil: {profile?.role === "seller" ? "Vendedor" : "Comprador"}</div>
              <div>
                Localização: {profile?.city ?? "—"}
                {profile?.state ? `/${profile.state}` : ""}
              </div>
              {isAdmin && <div className="font-medium text-forest">Acesso administrativo ativo</div>}
            </dl>
          </div>
          <div className="rounded-md border border-border bg-card p-6">
            <h3 className="font-display text-sm font-semibold text-forest">Próximos passos</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Explore o catálogo de implementos e salve os equipamentos de interesse.
            </p>
            <Button asChild className="mt-4 bg-forest hover:bg-forest/90">
              <Link to="/catalogo">Ver catálogo</Link>
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
