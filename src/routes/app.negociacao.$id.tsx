import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, FileText, Handshake, Send, Timer, Users, X } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { respondProposal } from "@/lib/app-queries";
import { ensureConversation, fetchNegotiation } from "@/lib/negotiation-queries";
import { sendMessage } from "@/lib/app-queries";
import {
  CONDITION_LABELS,
  formatBRL,
  formatDateTimeBR,
  ORDER_STATUS_LABELS,
  PROPOSAL_STATUS_LABELS,
} from "@/lib/format";
import { ensureOrderForProposal, fetchOrderByProposal, updateOrderStatus } from "@/lib/orders";
import { updateProposalTerms } from "@/features/listings/queries";
import {
  allowedActions,
  hoursLeft,
  isExpired,
  isOpen,
  roleIn,
  TERM_FIELDS,
  termsFilled,
  turnOf,
  type CommercialTerms,
} from "@/lib/permissions/negotiation";
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
  countered: "Contraproposta",
  cancelled: "Proposta cancelada",
  terms_updated: "Condições comerciais atualizadas",
};

function NegotiationDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [counter, setCounter] = useState("");
  const [text, setText] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsDraft, setTermsDraft] = useState<CommercialTerms>({});
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
      await updateOrderStatus(order.id, status);
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

  const saveTerms = useMutation({
    mutationFn: async () => {
      if (!data?.proposal) return;
      // A notificação à outra parte é gerada pelo banco de dados.
      await updateProposalTerms(data.proposal.id, termsDraft);
    },
    onSuccess: () => {
      setTermsOpen(false);
      toast.success("Condições registradas");
      void queryClient.invalidateQueries({ queryKey: ["negotiation", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (termsOpen) setTermsDraft((data?.proposal?.terms_json ?? {}) as CommercialTerms);
  }, [termsOpen, data?.proposal?.terms_json]);

  const respond = useMutation({
    mutationFn: async (action: "accepted" | "rejected" | "countered" | "cancelled") => {
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
      // A notificação à outra parte é gerada pelo banco de dados.
    },
    onSuccess: () => {
      setCounter("");
      toast.success("Negociação atualizada");
      void queryClient.invalidateQueries({ queryKey: ["negotiation", id] });
      void queryClient.invalidateQueries({ queryKey: ["proposals"] });
      void queryClient.invalidateQueries({ queryKey: ["negotiation-order", id] });
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
  const party = { userId: user?.id ?? "", buyerId: p.buyer_id, sellerId: p.seller_id };
  const actions = allowedActions(p.status, p.expires_at, party);
  const openStatus = actions.length > 0;
  const turn = turnOf(p.status);
  const myTurn = turn === roleIn(party);
  const left = hoursLeft(p.expires_at);
  const expired = isOpen(p.status) && isExpired(p.expires_at);
  const terms = (p.terms_json ?? {}) as CommercialTerms;
  const nameOf = (id: string | null) =>
    id === p.buyer_id
      ? (data.buyer?.full_name ?? "Comprador")
      : id === p.seller_id
        ? (data.seller?.full_name ?? "Vendedor")
        : "Sistema";

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
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {data.buyer?.full_name ?? "Comprador"} ↔ {data.seller?.full_name ?? "Vendedor"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Proposta atual</p>
                <p className="font-display text-2xl font-bold text-forest">{formatBRL(p.amount)}</p>
                {listing?.price != null && (
                  <p className="text-xs text-muted-foreground">
                    Anúncio: {formatBRL(listing.price)}
                  </p>
                )}
                <span className="mt-1 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-forest">
                  {expired ? "Expirada" : (PROPOSAL_STATUS_LABELS[p.status] ?? p.status)}
                </span>
                {isOpen(p.status) && !expired && left !== null && (
                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Timer className="h-3 w-3" /> válida por mais {left} h
                  </p>
                )}
              </div>
            </div>

            {openStatus && (
              <div className="mt-5 space-y-3 border-t border-border pt-5">
                <p className="text-sm text-muted-foreground">
                  {myTurn
                    ? "Sua vez: aceite, recuse ou envie uma contraproposta."
                    : `Aguardando resposta de ${turn === "buyer" ? "do comprador" : "do vendedor"}. Você ainda pode enviar uma contraproposta.`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate("accepted")}
                  >
                    <Check className="mr-1.5 h-4 w-4" /> Aceitar {formatBRL(p.amount)}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate("rejected")}
                  >
                    <X className="mr-1.5 h-4 w-4" /> Recusar
                  </Button>
                  {actions.includes("cancelled" as never) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={respond.isPending}
                      onClick={() => respond.mutate("cancelled")}
                    >
                      Cancelar minha proposta
                    </Button>
                  )}
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
            {expired && (
              <p className="mt-4 rounded-sm border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                Esta proposta expirou após 48 horas sem resposta. O comprador pode enviar uma nova
                proposta pelo anúncio.
              </p>
            )}
          </section>

          {/* Condições comerciais — aparecem depois da proposta (progressivo) */}
          {(isOpen(p.status) || p.status === "accepted") && !expired && (
            <section className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold text-forest">
                    Condições comerciais
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {termsFilled(terms)}/{TERM_FIELDS.length} definidas • ficam registradas para as
                    duas partes
                  </p>
                </div>
                {!termsOpen && (
                  <Button size="sm" variant="outline" onClick={() => setTermsOpen(true)}>
                    <FileText className="mr-1.5 h-4 w-4" />
                    {termsFilled(terms) ? "Editar condições" : "Definir condições"}
                  </Button>
                )}
              </div>
              {termsOpen ? (
                <form
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveTerms.mutate();
                  }}
                >
                  {TERM_FIELDS.map((f) => (
                    <div
                      key={f.key}
                      className={cn("space-y-1", f.key === "observacoes" && "sm:col-span-2")}
                    >
                      <Label htmlFor={`t-${f.key}`}>{f.label}</Label>
                      <Input
                        id={`t-${f.key}`}
                        value={termsDraft[f.key] ?? ""}
                        placeholder={f.placeholder}
                        onChange={(e) => setTermsDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" size="sm" disabled={saveTerms.isPending}>
                      Salvar condições
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setTermsOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              ) : termsFilled(terms) > 0 ? (
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  {TERM_FIELDS.filter((f) => terms[f.key]).map((f) => (
                    <div key={f.key}>
                      <dt className="text-xs text-muted-foreground">{f.label}</dt>
                      <dd className="font-medium text-forest">{terms[f.key]}</dd>
                    </div>
                  ))}
                  {order && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Comissão da plataforma</dt>
                      <dd className="font-medium text-forest">
                        {formatBRL(Number(order.commission_amount))}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Quando chegarem a um valor, registrem aqui pagamento, prazo, transporte, entrega e
                  documentação — evita mal-entendidos no fechamento.
                </p>
              )}
            </section>
          )}

          {order && (
            <section className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-base font-semibold text-forest">
                  Pedido da negociação
                </h2>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-forest">
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Valor acordado</dt>
                  <dd className="font-semibold text-forest">{formatBRL(Number(order.amount))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Comissão da plataforma</dt>
                  <dd>{formatBRL(Number(order.commission_amount))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Líquido ao vendedor</dt>
                  <dd>{formatBRL(Number(order.seller_net_amount))}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                Pagamento online ainda não habilitado: combinem forma de pagamento, vistoria e
                entrega entre as partes. A DDP AGRO registra o histórico, mas não garante a
                conclusão do negócio.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={orderStatus.isPending || order.status !== "created"}
                  onClick={() => orderStatus.mutate("awaiting_payment")}
                >
                  Pagamento a combinar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={orderStatus.isPending || order.status === "completed"}
                  onClick={() => orderStatus.mutate("in_delivery")}
                >
                  Em entrega
                </Button>
                <Button
                  size="sm"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  disabled={orderStatus.isPending || order.status === "completed"}
                  onClick={() => orderStatus.mutate("completed")}
                >
                  Negócio concluído
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={orderStatus.isPending || order.status === "cancelled"}
                  onClick={() => orderStatus.mutate("cancelled")}
                >
                  Cancelar pedido
                </Button>
              </div>
            </section>
          )}

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
          <h2 className="font-display text-base font-semibold text-forest">Linha do tempo</h2>
          <p className="text-xs text-muted-foreground">
            Quem fez o quê, quando e por quanto. Registro auditável.
          </p>
          <ol className="space-y-4 border-l border-border pl-4">
            {data.events.map((ev, i) => {
              const amountInMsg = ev.message?.match(/R\$\s?([\d.,]+)/)?.[1];
              const value =
                ev.event_type === "created"
                  ? formatBRL(Number(data.events.length === 1 ? p.amount : p.amount))
                  : amountInMsg
                    ? formatBRL(Number(amountInMsg.replace(/\./g, "").replace(",", ".")))
                    : null;
              const last = i === data.events.length - 1;
              return (
                <li key={ev.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full",
                      last ? "bg-accent ring-4 ring-accent/20" : "bg-border",
                    )}
                  />
                  <p className="text-sm font-semibold text-forest">
                    {EVENT_LABELS[ev.event_type] ?? ev.event_type}
                    {ev.event_type === "countered" && value && (
                      <span className="ml-1 font-display">{value}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    por {ev.actor_id === user?.id ? "você" : nameOf(ev.actor_id)}
                  </p>
                  {ev.message && ev.event_type !== "countered" && (
                    <p className="text-xs text-muted-foreground">{ev.message}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTimeBR(ev.created_at)}
                  </p>
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </AppPage>
  );
}
