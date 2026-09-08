import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Target } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchSellerLeadPipeline, type SellerLead } from "@/features/listings/queries";
import { formatBRL, formatDateTimeBR, PROPOSAL_STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/leads")({
  head: () => ({
    meta: [
      { title: "Interessados | DDP AGRO" },
      {
        name: "description",
        content: "Quem demonstrou interesse em cada máquina e qual é a próxima ação.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Leads,
});

const STAGES: { key: SellerLead["stage"]; label: string }[] = [
  { key: "interessado", label: "Interessado" },
  { key: "contato", label: "Contato" },
  { key: "proposta", label: "Proposta" },
  { key: "negociacao", label: "Negociação" },
  { key: "aceite", label: "Aceite" },
  { key: "venda", label: "Venda" },
];

function nextAction(l: SellerLead) {
  switch (l.stage) {
    case "proposta":
      return { text: "Responder proposta", to: "negotiation" as const, primary: true };
    case "negociacao":
      return { text: "Aguardando o comprador — acompanhe a conversa", to: "negotiation" as const, primary: false };
    case "aceite":
      return { text: "Combinar pagamento e retirada no pedido", to: "negotiation" as const, primary: true };
    case "contato":
      return { text: "Responder mensagem", to: "messages" as const, primary: true };
    case "interessado":
      return { text: "Sem ação — mantenha o anúncio completo e com fotos", to: null, primary: false };
    case "venda":
      return { text: "Negócio concluído", to: null, primary: false };
    default:
      return { text: "Negociação encerrada", to: null, primary: false };
  }
}

function Leads() {
  const { user } = useAuth();
  const {
    data: leads = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["seller-lead-pipeline", user?.id],
    queryFn: () => fetchSellerLeadPipeline(user!.id),
    enabled: Boolean(user),
  });

  const counts = Object.fromEntries(
    STAGES.map((s) => [s.key, leads.filter((l) => l.stage === s.key).length]),
  ) as Record<SellerLead["stage"], number>;
  const active = leads.filter((l) => l.stage !== "encerrado");

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Interessados</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada interessado está ligado a uma máquina. Priorize quem já enviou proposta.
      </p>

      {/* Pipeline */}
      <ol className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STAGES.map((s) => (
          <li key={s.key} className="rounded-md border border-border bg-card p-3">
            <p className="font-display text-xl font-bold text-forest">
              {isLoading ? "—" : counts[s.key]}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
          </li>
        ))}
      </ol>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar seus interessados. Tente novamente em instantes.
        </p>
      ) : active.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <Target className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-lg font-semibold text-forest">
            Nenhum interessado ainda
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Anúncios com fotos e ficha técnica completa atraem mais compradores.
          </p>
          <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app/publicar">Publicar anúncio</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {active.map((l) => {
            const action = nextAction(l);
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                        action.primary ? "bg-accent/15 text-accent-foreground" : "bg-secondary text-forest",
                      )}
                    >
                      {STAGES.find((s) => s.key === l.stage)?.label ?? l.stage}
                    </span>
                    <p className="font-display text-sm font-semibold text-forest">{l.buyerName}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Máquina:{" "}
                    <Link
                      to="/app/anuncio/$id"
                      params={{ id: l.listingId }}
                      className="font-medium text-forest hover:underline"
                    >
                      {l.listingTitle}
                    </Link>
                    {" • "}última interação {formatDateTimeBR(l.lastAt)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Próxima ação: <span className="font-medium text-foreground">{action.text}</span>
                  </p>
                </div>
                <div className="text-right">
                  {l.amount != null && (
                    <>
                      <p className="font-display text-base font-bold text-forest">
                        {formatBRL(l.amount)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {PROPOSAL_STATUS_LABELS[l.status ?? ""] ?? "Proposta atual"}
                      </p>
                    </>
                  )}
                </div>
                {action.to === "negotiation" && l.proposalId ? (
                  <Button asChild size="sm" className={cn(action.primary && "bg-forest hover:bg-forest/90")}>
                    <Link to="/app/negociacao/$id" params={{ id: l.proposalId }}>
                      Abrir <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : action.to === "messages" ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/app/mensagens">Mensagens</Link>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </AppPage>
  );
}
