import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, Heart, MessageSquare, Target } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchSellerLeads } from "@/lib/app-queries";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/app/leads")({
  head: () => ({
    meta: [
      { title: "Leads e interessados | DDP AGRO" },
      { name: "description", content: "Veja quem demonstrou interesse nos seus anúncios e priorize o contato." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Leads,
});

function Leads() {
  const { user } = useAuth();
  const { data: leads = [], isLoading, isError } = useQuery({
    queryKey: ["seller-leads", user?.id],
    queryFn: () => fetchSellerLeads(user!.id),
    enabled: Boolean(user),
  });

  const withInterest = leads.filter((l) => l.favorites + l.conversations + l.proposals > 0);

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Leads e interessados</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Oportunidades por anúncio: quem favoritou, abriu conversa ou enviou proposta.
      </p>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar seus interessados. Tente novamente em instantes.
        </p>
      ) : withInterest.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <Target className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-lg font-semibold text-forest">Nenhum interessado ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Publique anúncios com fotos e dados técnicos completos para atrair mais compradores.
          </p>
          <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app/publicar">Publicar anúncio</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {withInterest.map((l) => (
            <div key={l.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-base font-semibold text-forest">{l.title}</p>
                <div className="flex items-center gap-2">
                  {l.openProposals > 0 && (
                    <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
                      {l.openProposals} precisa(m) de resposta
                    </span>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to="/app/negociacoes">Ver propostas</Link>
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="h-4 w-4" /> {l.views} visualizações
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="h-4 w-4" /> {l.favorites} favoritaram
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" /> {l.conversations} conversas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Target className="h-4 w-4" /> {l.proposals} propostas
                </span>
                {l.negotiatingValue > 0 && (
                  <span className="font-semibold text-forest">
                    Em negociação: {formatBRL(l.negotiatingValue)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppPage>
  );
}
