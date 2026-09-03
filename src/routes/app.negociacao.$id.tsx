import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, Handshake, Send, X } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { respondProposal } from "@/lib/app-queries";
import {
  ensureConversation,
  fetchNegotiation,
  notifyCounterpart,
} from "@/lib/negotiation-queries";
import { sendMessage } from "@/lib/app-queries";
import {
  CONDITION_LABELS,
  formatBRL,
  formatDateTimeBR,
  ORDER_STATUS_LABELS,
  PROPOSAL_STATUS_LABELS,
} from "@/lib/format";
import { ensureOrderForProposal, fetchOrderByProposal, updateOrderStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/negociacao/$id")({
  head: () => ({
    meta: [
      { title: "Negociação | DDP AGRO" },
      { name: "description", content: "Proposta, histórico e conversa em uma única tela." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NegotiationDetail,
});

const EVENT_LABELS: Record<string, string> = {
  created: "Proposta enviada",
  accepted: "Proposta aceita",
  rejected: "Proposta recusada",
  countered: "Contraproposta registrada",
  cancelled: "Proposta cancelada",
};

function NegotiationDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [counter, setCounter] = useState("");
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["negotiation", id],
    queryFn: () => fetchNegotiation(id),
    refetchInterval: 20_000,
  });

  const { data: order } = useQuery({
    queryKey: ["negotiation-order", id],
    queryFn: () => fetchOrderByProposal(id),
  });

  const orderStatus = useMutation({
    mutationFn: async (status: "awaiting_payment" | "in_delivery" | "completed" | "cancelled") => {
      if (!user || !order) return;
      await updateOrderStatus(order.id, status, user.id);
    },
    onSuccess: () => {
      toast.success("Pedido atualizado");
      void queryClient.invalidateQueries({ queryKey: ["negotiation-order", id] });
    },
    onError: () => toast.error("Não foi possível atualizar o pedido."),
  });



  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [data?.messages.length]);

  const respond = useMutation({
    mutationFn: async (action: "accepted" | "rejected" | "countered") => {
      if (!user || !data?.proposal) return;
      const p = data.proposal;
      const amount =
        action === "countered" ? Number(counter.replace(/\./g, "").replace(",", ".")) : undefined;
      if (action === "countered" && (!amount || amount <= 0)) {
        throw new Error("Informe um valor válido para a contraproposta.");
      }
      await respondProposal(p.id, action, user.id, amount);
      if (action === "accepted") {
        await ensureOrderForProposal({
          proposalId: p.id,
          listingId: p.listing_id,
          buyerId: p.buyer_id,
          sellerId: p.seller_id,
          amount: Number(p.amount),
          actorId: user.id,
        });
      }
      const other = p.buyer_id === user.id ? p.seller_id : p.buyer_id;
      await notifyCounterpart({
        userId: other,
        type: `proposal_${action}`,
        title: EVENT_LABELS[action] ?? "Atualização da negociação",
        message: amount
          ? `Nova contraproposta de ${formatBRL(amount)}.`
          : "Sua negociação foi atualizada.",
        proposalId: p.id,
      });
    },
    onSuccess: () => {
      setCounter("");
      toast.success("Negociação atualizada");
      void queryClient.invalidateQueries({ queryKey: ["negotiation", id] });
      void queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!user || !data?.proposal || !text.trim()) return;
      const p = data.proposal;
      const conversationId =
        data.conversationId ??
        (await ensureConversation({
          id: p.id,
          listing_id: p.listing_id,
          buyer_id: p.buyer_id,
          seller_id: p.seller_id,
        }));
      await sendMessage(conversationId, user.id, text.trim());
    },
    onSuccess: () => {
      setText("");
      void queryClient.invalidateQueries({ queryKey: ["negotiation", id] });
    },
    onError: () => toast.error("Não foi possível enviar a mensagem."),
  });

  if (isLoading) {
    return (
      <AppPage>
        <div className="h-64 animate-pulse rounded-lg bg-secondary/60" />
      </AppPage>
    );
  }

  if (!data?.proposal) {
    return (
      <AppPage>
        <h1 className="font-display text-2xl font-bold text-forest">Negociação não encontrada</h1>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/app/negociacoes">Voltar</Link>
        </Button>
      </AppPage>
    );
  }

  const p = data.proposal;
  const listing = p.listings as {
    title: string;
    slug: string;
    price: number | null;
    city: string | null;
    state: string | null;
    condition: string;
    brand: string | null;
    model: string | null;
    manufacture_year: number | null;
  } | null;
  const isSeller = p.seller_id === user?.id;
  const openStatus = p.status === "open" || p.status === "countered";

  return (
    <AppPage>
      <Link
        to="/app/negociacoes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-forest"
      >
        <ArrowLeft className="h-4 w-4" /> Minhas negociações
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-forest">
                  {isSeller ? "Venda" : "Compra"}
                </span>
                <h1 className="mt-2 font-display text-xl font-bold text-forest sm:text-2xl">
                  {listing?.title ?? "Implemento"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {[
                    listing?.brand,
                    listing?.model,
                    listing?.manufacture_year,
                    listing?.condition ? CONDITION_LABELS[listing.condition] : null,
                    [listing?.city, listing?.state].filter(Boolean).join("/"),
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Valor em negociação</p>
                <p className="font-display text-2xl font-bold text-forest">{formatBRL(p.amount)}</p>
                {listing?.price != null && (
                  <p className="text-xs text-muted-foreground">
                    Anúncio: {formatBRL(listing.price)}
                  </p>
                )}
                <span className="mt-1 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-forest">
                  {PROPOSAL_STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>
            </div>

            {openStatus && (
              <div className="mt-5 space-y-3 border-t border-border pt-5">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate("accepted")}
                  >
                    <Check className="mr-1.5 h-4 w-4" /> Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate("rejected")}
                  >
                    <X className="mr-1.5 h-4 w-4" /> Recusar
                  </Button>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="contra">Contraproposta (R$)</Label>
                    <Input
                      id="contra"
                      inputMode="decimal"
                      value={counter}
                      onChange={(e) => setCounter(e.target.value)}
                      placeholder="Ex.: 480000"
                      className="w-44"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate("countered")}
                  >
                    <Handshake className="mr-1.5 h-4 w-4" /> Enviar contraproposta
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-display text-base font-semibold text-forest">Conversa</h2>
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
              {data.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma mensagem ainda. Combine detalhes de pagamento, vistoria e retirada por
                  aqui — tudo fica registrado.
                </p>
              ) : (
                data.messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          mine ? "bg-forest text-primary-foreground" : "bg-secondary text-forest",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p className="mt-1 text-[10px] opacity-70">
                          {formatDateTimeBR(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send.mutate();
              }}
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva uma mensagem..."
              />
              <Button type="submit" disabled={send.isPending || !text.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </section>
        </div>

        <aside className="space-y-3 rounded-lg border border-border bg-card p-5 lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-display text-base font-semibold text-forest">Histórico auditável</h2>
          <ol className="space-y-4 border-l border-border pl-4">
            {data.events.map((ev) => (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                <p className="text-sm font-semibold text-forest">
                  {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                </p>
                {ev.message && <p className="text-xs text-muted-foreground">{ev.message}</p>}
                <p className="text-[11px] text-muted-foreground">
                  {formatDateTimeBR(ev.created_at)}
                </p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </AppPage>
  );
}
