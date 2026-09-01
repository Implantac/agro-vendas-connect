import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyProposals, respondProposal } from "@/lib/app-queries";
import { formatBRL, PROPOSAL_STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/propostas")({
  head: () => ({
    meta: [
      { title: "Propostas | DDP AGRO" },
      { name: "description", content: "Propostas recebidas e enviadas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Propostas,
});

function Propostas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [counterFor, setCounterFor] = useState<string | null>(null);
  const [counterValue, setCounterValue] = useState("");

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals", user?.id],
    queryFn: () => fetchMyProposals(user!.id),
    enabled: Boolean(user),
  });

  const respond = useMutation({
    mutationFn: ({
      id,
      action,
      amount,
    }: {
      id: string;
      action: "accepted" | "rejected" | "countered";
      amount?: number;
    }) => respondProposal(id, action, user!.id, amount),
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === "accepted"
          ? "Proposta aceita! Continue a conversa pelo chat."
          : vars.action === "rejected"
            ? "Proposta recusada."
            : "Contraproposta enviada.",
      );
      setCounterFor(null);
      setCounterValue("");
      void queryClient.invalidateQueries({ queryKey: ["proposals"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Não foi possível responder à proposta. Tente novamente."),
  });

  const received = proposals.filter((p) => p.seller_id === user?.id);
  const sent = proposals.filter((p) => p.buyer_id === user?.id);

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Propostas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Responda propostas recebidas e acompanhe as enviadas.
      </p>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : received.length === 0 && sent.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <HeartHandshake className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-lg font-semibold text-forest">
            Nenhuma proposta ainda
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Propostas recebidas nos seus anúncios e enviadas em máquinas de interesse aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {received.length > 0 && (
            <section>
              <h2 className="font-display text-base font-semibold text-forest">
                Recebidas ({received.length})
              </h2>
              <div className="mt-3 space-y-3">
                {received.map((p) => {
                  const listing = p.listings as { title: string; price: number | null } | null;
                  const pending = ["open", "countered"].includes(p.status);
                  return (
                    <div key={p.id} className="rounded-lg border border-border bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-display text-base font-semibold text-forest">
                            {listing?.title ?? "Implemento"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Recebida em {new Date(p.created_at).toLocaleDateString("pt-BR")}
                          </p>
                          {p.message && (
                            <p className="mt-1 text-sm italic text-muted-foreground">
                              “{p.message}”
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Valor proposto</p>
                            <p className="font-display text-lg font-bold text-forest">
                              {formatBRL(p.amount)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              p.status === "accepted"
                                ? "bg-green-100 text-green-700"
                                : p.status === "rejected"
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-secondary text-forest",
                            )}
                          >
                            {PROPOSAL_STATUS_LABELS[p.status] ?? p.status}
                          </span>
                        </div>
                      </div>
                      {pending && (
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                          <Button
                            size="sm"
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                            disabled={respond.isPending}
                            onClick={() => respond.mutate({ id: p.id, action: "accepted" })}
                          >
                            Aceitar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={respond.isPending}
                            onClick={() => {
                              setCounterFor(counterFor === p.id ? null : p.id);
                              setCounterValue(String(p.amount));
                            }}
                          >
                            Contraproposta
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={respond.isPending}
                            onClick={() => respond.mutate({ id: p.id, action: "rejected" })}
                          >
                            Recusar
                          </Button>
                        </div>
                      )}
                      {counterFor === p.id && (
                        <form
                          className="mt-3 flex items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const amount = Number(counterValue.replace(/\D/g, "")) / 100 || Number(counterValue);
                            if (!amount || amount <= 0) {
                              toast.error("Informe um valor válido.");
                              return;
                            }
                            respond.mutate({ id: p.id, action: "countered", amount });
                          }}
                        >
                          <Input
                            value={counterValue}
                            onChange={(e) => setCounterValue(e.target.value)}
                            placeholder="Novo valor (R$)"
                            inputMode="numeric"
                            className="max-w-44"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                            disabled={respond.isPending}
                          >
                            Enviar contraproposta
                          </Button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {sent.length > 0 && (
            <section>
              <h2 className="font-display text-base font-semibold text-forest">
                Enviadas ({sent.length})
              </h2>
              <div className="mt-3 space-y-3">
                {sent.map((p) => {
                  const listing = p.listings as { title: string; slug: string } | null;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-display text-base font-semibold text-forest">
                          {listing?.title ?? "Implemento"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Enviada em {new Date(p.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-display text-lg font-bold text-forest">
                          {formatBRL(p.amount)}
                        </p>
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-forest">
                          {PROPOSAL_STATUS_LABELS[p.status] ?? p.status}
                        </span>
                        {listing?.slug && (
                          <Button asChild variant="outline" size="sm">
                            <Link to="/implementos/$slug" params={{ slug: listing.slug }}>
                              Ver anúncio
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </AppPage>
  );
}
