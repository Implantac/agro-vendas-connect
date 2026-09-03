import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyOrders } from "@/lib/app-queries";
import { formatBRL, formatDateBR, ORDER_STATUS_LABELS } from "@/lib/format";

export const Route = createFileRoute("/app/pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos | DDP AGRO" },
      { name: "description", content: "Acompanhe os pedidos gerados a partir das negociações aceitas." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pedidos,
});

function Pedidos() {
  const { user } = useAuth();
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: () => fetchMyOrders(user!.id),
    enabled: Boolean(user),
  });

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Pedidos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pedidos criados quando uma proposta é aceita, do pagamento até a entrega.
      </p>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar seus pedidos. Tente novamente em instantes.
        </p>
      ) : orders.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-lg font-semibold text-forest">Nenhum pedido ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Assim que uma negociação for aceita, o pedido aparece aqui com o andamento completo.
          </p>
          <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app/negociacoes">Ver negociações</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {orders.map((order) => {
            const listing = order.listings as { title: string } | null;
            const isBuyer = order.buyer_id === user?.id;
            return (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-forest">
                      {isBuyer ? "Compra" : "Venda"}
                    </span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-forest">
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-display text-base font-semibold text-forest">
                    {listing?.title ?? "Implemento"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Criado em {formatDateBR(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="font-display text-lg font-bold text-forest">{formatBRL(order.amount)}</p>
                    {!isBuyer && (
                      <p className="text-xs text-muted-foreground">
                        Líquido: {formatBRL(order.seller_net_amount)}
                      </p>
                    )}
                  </div>
                  {order.proposal_id && (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/app/negociacao/$id" params={{ id: order.proposal_id }}>
                        Abrir negociação
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppPage>
  );
}
