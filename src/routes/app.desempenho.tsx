import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, Clock, Eye, PauseCircle } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyListings } from "@/lib/app-queries";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/app/desempenho")({
  head: () => ({
    meta: [
      { title: "Desempenho dos anúncios | DDP AGRO" },
      { name: "description", content: "Visualizações, status e valor da sua carteira de anúncios." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Desempenho,
});

function Desempenho() {
  const { user } = useAuth();
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: () => fetchMyListings(user!.id),
    enabled: Boolean(user),
  });

  const approved = listings.filter((l) => l.status === "approved").length;
  const inReview = listings.filter((l) => l.status === "in_review").length;
  const paused = listings.filter((l) => l.status === "paused").length;
  const views = listings.reduce((sum, l) => sum + (l.views_count ?? 0), 0);
  const total = listings.reduce((sum, l) => sum + Number(l.price ?? 0), 0);

  const cards = [
    { icon: CheckCircle2, label: "Anúncios ativos", value: String(approved) },
    { icon: Clock, label: "Em análise", value: String(inReview) },
    { icon: PauseCircle, label: "Pausados", value: String(paused) },
    { icon: Eye, label: "Visualizações totais", value: String(views) },
  ];

  return (
    <AppPage>
      <h1 className="text-2xl font-bold tracking-tight text-forest">Desempenho dos anúncios</h1>
      <p className="text-sm text-muted-foreground">
        Acompanhe o alcance da sua carteira de máquinas na plataforma.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-5">
            <card.icon className="h-5 w-5 text-accent" />
            <p className="mt-3 text-2xl font-bold text-forest">{isLoading ? "—" : card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent" />
          <h2 className="text-sm font-semibold text-forest">Valor total anunciado</h2>
        </div>
        <p className="mt-2 text-3xl font-bold text-forest">{formatBRL(total)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Soma dos preços de {listings.length} anúncio(s) cadastrado(s).
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/app/meus-anuncios">Gerenciar anúncios</Link>
        </Button>
      </div>
    </AppPage>
  );
}
