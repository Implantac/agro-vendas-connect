import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateTimeBR, ORDER_STATUS_LABELS } from "@/lib/format";

export const Route = createFileRoute("/app/admin/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos | Admin DDP AGRO" },
      { name: "description", content: "Acompanhe os pedidos gerados na plataforma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminOrders,
});

function AdminOrders() {
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,amount,commission_amount,status,created_at,proposal_id,listings(title)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest">Pedidos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pedidos gerados a partir de propostas aceitas, com a comissão da plataforma.
      </p>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar os pedidos.
        </p>
      ) : orders.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
          <Package className="h-9 w-9 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum pedido registrado ainda.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => {
            const listing = o.listings as { title: string } | null;
            return (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div className="min-w-0">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-forest">
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                  <p className="mt-2 truncate font-display text-base font-semibold text-forest">
                    {listing?.title ?? "Implemento"}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTimeBR(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-forest">{formatBRL(o.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      Comissão: {formatBRL(o.commission_amount)}
                    </p>
                  </div>
                  {o.proposal_id && (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/app/negociacao/$id" params={{ id: o.proposal_id }}>
                        Abrir
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
