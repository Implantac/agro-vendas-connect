import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Handshake, MessageSquare } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyProposals } from "@/lib/app-queries";
import { formatBRL, PROPOSAL_STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/negociacoes")({
  head: () => ({
    meta: [
      { title: "Minhas negociações | DDP AGRO" },
      { name: "description", content: "Acompanhe suas negociações de compra e venda." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Negociacoes,
});

function Negociacoes() {
  const { user } = useAuth();
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals", user?.id],
    queryFn: () => fetchMyProposals(user!.id),
    enabled: Boolean(user),
  });

  const active = proposals.filter((p) => ["open", "countered"].includes(p.status));
  const closed = proposals.filter((p) => !["open", "countered"].includes(p.status));

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">
        Minhas negociações
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Acompanhe o andamento das suas compras e vendas.
      </p>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <Handshake className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-lg font-semibold text-forest">
            Nenhuma negociação em andamento
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Quando você enviar ou receber uma proposta, ela aparecerá aqui com todo o histórico.
          </p>
          <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app/comprar">Ver oportunidades</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {[
            { title: "Em andamento", items: active },
            { title: "Encerradas", items: closed },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <section key={group.title}>
                <h2 className="font-display text-base font-semibold text-forest">{group.title}</h2>
                <div className="mt-3 space-y-3">
                  {group.items.map((p) => {
                    const listing = p.listings as {
                      title: string;
                      slug: string;
                      price: number | null;
                      city: string | null;
                      state: string | null;
                    } | null;
                    const isBuyer = p.buyer_id === user?.id;
                    return (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-forest">
                              {isBuyer ? "Compra" : "Venda"}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                                p.status === "accepted"
                                  ? "bg-green-100 text-green-700"
                                  : p.status === "rejected" || p.status === "cancelled"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-secondary text-forest",
                              )}
                            >
                              {PROPOSAL_STATUS_LABELS[p.status] ?? p.status}
                            </span>
                          </div>
                          <p className="mt-2 truncate font-display text-base font-semibold text-forest">
                            {listing?.title ?? "Implemento"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[listing?.city, listing?.state].filter(Boolean).join(" • ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-5">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Proposta atual</p>
                            <p className="font-display text-lg font-bold text-forest">
                              {formatBRL(p.amount)}
                            </p>
                            {listing?.price != null && listing.price !== p.amount && (
                              <p className="text-xs text-muted-foreground">
                                Anúncio: {formatBRL(listing.price)}
                              </p>
                            )}
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <Link to="/app/negociacao/$id" params={{ id: p.id }}>
                              <MessageSquare className="mr-1.5 h-4 w-4" /> Abrir negociação
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      )}
    </AppPage>
  );
}
