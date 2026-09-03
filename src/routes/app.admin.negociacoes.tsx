import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Handshake } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDateTimeBR, PROPOSAL_STATUS_LABELS } from "@/lib/format";

export const Route = createFileRoute("/app/admin/negociacoes")({
  head: () => ({
    meta: [
      { title: "Negociações | Admin DDP AGRO" },
      { name: "description", content: "Acompanhe todas as negociações ativas da plataforma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminNegotiations,
});

function AdminNegotiations() {
  const { data: proposals = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("id,amount,status,created_at,updated_at,listings(title)")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const open = proposals.filter((p) => ["open", "countered"].includes(p.status));

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest">Negociações</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {open.length} negociação(ões) em aberto de {proposals.length} registradas.
      </p>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar as negociações.
        </p>
      ) : proposals.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
          <Handshake className="h-9 w-9 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma negociação registrada ainda.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {proposals.map((p) => {
            const listing = p.listings as { title: string } | null;
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div className="min-w-0">
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-forest">
                    {PROPOSAL_STATUS_LABELS[p.status] ?? p.status}
                  </span>
                  <p className="mt-2 truncate font-display text-base font-semibold text-forest">
                    {listing?.title ?? "Implemento"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Atualizada em {formatDateTimeBR(p.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-5">
                  <p className="font-display text-lg font-bold text-forest">{formatBRL(p.amount)}</p>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/app/negociacao/$id" params={{ id: p.id }}>
                      Abrir
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppPage>
  );
}
