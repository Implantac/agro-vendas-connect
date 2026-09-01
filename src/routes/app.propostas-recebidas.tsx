import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Inbox } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, PROPOSAL_STATUS_LABELS } from "@/lib/format";

export const Route = createFileRoute("/app/propostas-recebidas")({
  head: () => ({
    meta: [
      { title: "Propostas recebidas | DDP AGRO" },
      { name: "description", content: "Propostas enviadas por compradores para os seus anúncios." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PropostasRecebidas,
});

function PropostasRecebidas() {
  const { user } = useAuth();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["received-proposals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("proposals")
        .select("id,amount,status,message,created_at,listings(title,slug)")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: Boolean(user),
  });

  return (
    <AppPage>
      <h1 className="text-2xl font-bold tracking-tight text-forest">Propostas recebidas</h1>
      <p className="text-sm text-muted-foreground">
        Responda rapidamente para aumentar suas chances de fechar negócio.
      </p>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Carregando propostas...</p>
      ) : proposals.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border p-10 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-base font-semibold text-forest">Nenhuma proposta recebida</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Publique novos anúncios para receber propostas de compradores aprovados.
          </p>
          <Button asChild className="mt-4">
            <Link to="/app/publicar">Publicar anúncio</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {proposals.map((proposal) => (
            <li key={proposal.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-forest">
                    {proposal.listings?.title ?? "Anúncio"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Proposta de {formatBRL(Number(proposal.amount))}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-forest">
                  {PROPOSAL_STATUS_LABELS[proposal.status] ?? proposal.status}
                </span>
              </div>
              {proposal.message && (
                <p className="mt-2 text-sm text-muted-foreground">{proposal.message}</p>
              )}
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/app/negociacoes">Ver negociação</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </AppPage>
  );
}
