import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchSellerFunnel, type SellerFunnel } from "@/features/listings/queries";
import { formatBRL, formatDateBR, LISTING_STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/desempenho")({
  head: () => ({
    meta: [
      { title: "Painel comercial | DDP AGRO" },
      {
        name: "description",
        content: "Funil de vendas por máquina: visualizações, interessados, propostas e vendas.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Desempenho,
});

const STEPS: { key: keyof SellerFunnel; label: string }[] = [
  { key: "views", label: "Visualizações" },
  { key: "interested", label: "Interessados" },
  { key: "contacts", label: "Contatos" },
  { key: "proposals", label: "Propostas" },
  { key: "negotiating", label: "Negociação" },
  { key: "accepted", label: "Aceite" },
  { key: "sales", label: "Venda" },
];

/** Pontuação de proximidade de venda: pesa etapas mais avançadas. */
function heat(r: SellerFunnel) {
  return r.accepted * 100 + r.negotiating * 40 + r.proposals * 20 + r.contacts * 5 + r.interested * 2 + r.views * 0.2;
}

function Desempenho() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["seller-funnel", user?.id],
    queryFn: () => fetchSellerFunnel(user!.id),
    enabled: Boolean(user),
  });

  const total = data?.total;
  const rows = (data?.rows ?? []).slice().sort((a, b) => heat(b) - heat(a));
  const max = Math.max(1, total?.views ?? 0);

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Painel comercial</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Quais máquinas estão mais perto de vender — do primeiro olhar até o negócio fechado.
      </p>

      {/* Funil agregado */}
      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-forest">
          <TrendingUp className="h-4 w-4 text-accent" /> Funil de vendas
        </h2>
        <ol className="mt-4 grid gap-2 sm:grid-cols-7">
          {STEPS.map((s, i) => {
            const v = total?.[s.key] ?? 0;
            const prev = i > 0 ? (total?.[STEPS[i - 1]!.key] ?? 0) : null;
            const conv = prev ? Math.round((v / prev) * 100) : null;
            return (
              <li key={s.key} className="rounded-md bg-secondary/60 p-3">
                <p className="font-display text-2xl font-bold text-forest">
                  {isLoading ? "—" : v}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <div className="mt-2 h-1 rounded-full bg-border">
                  <div
                    className="h-1 rounded-full bg-accent"
                    style={{ width: `${Math.min(100, (v / max) * 100)}%` }}
                  />
                </div>
                {conv !== null && (
                  <p className="mt-1 text-[10px] text-muted-foreground">{conv}% da etapa anterior</p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Por máquina */}
      <section className="mt-6 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-forest">
            <BarChart3 className="h-4 w-4 text-accent" /> Por máquina (mais quentes primeiro)
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/meus-anuncios">Gerenciar anúncios</Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="m-5 h-40 animate-pulse rounded-md bg-secondary/60" />
        ) : rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Nenhum anúncio ainda.{" "}
            <Link to="/app/publicar" className="font-medium text-forest underline">
              Publicar a primeira máquina
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-2 text-left font-medium">Máquina</th>
                  {STEPS.map((s) => (
                    <th key={s.key} className="px-2 py-2 text-right font-medium">
                      {s.label}
                    </th>
                  ))}
                  <th className="px-5 py-2 text-right font-medium">Última interação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const hot = r.negotiating + r.accepted > 0;
                  return (
                    <tr key={r.id} className={cn(hot && "bg-accent/5")}>
                      <td className="px-5 py-3">
                        <Link
                          to="/app/anuncio/$id"
                          params={{ id: r.id }}
                          className="font-display font-semibold text-forest hover:underline"
                        >
                          {r.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {LISTING_STATUS_LABELS[r.status] ?? r.status} •{" "}
                          {r.price ? formatBRL(r.price) : "Sob consulta"}
                        </p>
                      </td>
                      {STEPS.map((s) => (
                        <td
                          key={s.key}
                          className={cn(
                            "px-2 py-3 text-right tabular-nums",
                            r[s.key] > 0 ? "font-semibold text-forest" : "text-muted-foreground",
                          )}
                        >
                          {r[s.key]}
                        </td>
                      ))}
                      <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                        {r.lastInteraction ? formatDateBR(r.lastInteraction) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppPage>
  );
}
