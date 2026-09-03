import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppPage } from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, ORDER_STATUS_LABELS } from "@/lib/format";

export const Route = createFileRoute("/app/admin/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro | Admin DDP AGRO" },
      { name: "description", content: "Volume negociado, comissões e assinaturas da plataforma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminFinance,
});

function AdminFinance() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "finance"],
    queryFn: async () => {
      const [orders, memberships] = await Promise.all([
        supabase.from("orders").select("amount,commission_amount,status"),
        supabase.from("membership_requests").select("amount,payment_status"),
      ]);
      const o = orders.data ?? [];
      const m = memberships.data ?? [];
      return {
        gmv: o.reduce((s, x) => s + Number(x.amount ?? 0), 0),
        commission: o.reduce((s, x) => s + Number(x.commission_amount ?? 0), 0),
        completed: o.filter((x) => x.status === "completed").length,
        open: o.filter((x) => !["completed", "cancelled"].includes(x.status)).length,
        byStatus: Object.entries(
          o.reduce<Record<string, number>>((acc, x) => {
            acc[x.status] = (acc[x.status] ?? 0) + 1;
            return acc;
          }, {}),
        ),
        membershipPaid: m
          .filter((x) => x.payment_status === "paid")
          .reduce((s, x) => s + Number(x.amount ?? 0), 0),
        membershipPending: m.filter((x) => x.payment_status === "pending").length,
      };
    },
  });

  if (isError) {
    return (
      <AppPage>
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar os dados financeiros.
        </p>
      </AppPage>
    );
  }

  const cards = [
    { label: "Volume negociado", value: formatBRL(data?.gmv ?? 0) },
    { label: "Comissão acumulada", value: formatBRL(data?.commission ?? 0) },
    { label: "Assinaturas pagas", value: formatBRL(data?.membershipPaid ?? 0) },
    { label: "Pedidos em andamento", value: String(data?.open ?? 0) },
    { label: "Pedidos concluídos", value: String(data?.completed ?? 0) },
    { label: "Assinaturas pendentes", value: String(data?.membershipPending ?? 0) },
  ];

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest">Financeiro</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Indicadores consolidados de negócios e assinaturas. Valores reais registrados na plataforma.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="mt-1 font-display text-xl font-bold text-forest">
              {isLoading ? "—" : c.value}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-base font-semibold text-forest">Pedidos por status</h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
        <ul className="divide-y divide-border">
          {isLoading && <li className="px-5 py-4 text-sm text-muted-foreground">Carregando...</li>}
          {!isLoading && (data?.byStatus.length ?? 0) === 0 && (
            <li className="px-5 py-4 text-sm text-muted-foreground">Nenhum pedido registrado ainda.</li>
          )}
          {data?.byStatus.map(([status, count]) => (
            <li key={status} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="text-forest">{ORDER_STATUS_LABELS[status] ?? status}</span>
              <span className="font-semibold text-forest">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppPage>
  );
}
