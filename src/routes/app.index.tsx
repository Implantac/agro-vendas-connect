import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Cog,
  Droplets,
  Sprout,
  Tractor,
  Truck,
  Wheat,
  Handshake,
  Heart,
  HeartHandshake,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  PlusCircle,
} from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { ListingCard } from "@/components/catalog/ListingCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAppRole } from "@/features/auth/useAppRole";
import { fetchDashboardCounts, fetchMyProposals, fetchNotifications } from "@/lib/app-queries";
import { fetchApprovedListings, fetchCategories } from "@/lib/queries";
import { CONDITION_LABELS, formatBRL, PROPOSAL_STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard | DDP AGRO" },
      { name: "description", content: "Resumo dos seus negócios no DDP AGRO." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const CATEGORY_ICONS = [Tractor, Wheat, Sprout, Droplets, Cog, Truck];

const TRUST_ITEMS = [
  "Vendedor aprovado",
  "Dados verificados",
  "Anúncio aprovado",
  "Ambiente protegido",
  "Histórico da negociação",
  "Suporte especializado",
];

function Dashboard() {
  const { user, profile } = useAuth();
  const { mode } = useAppRole();
  const isSeller = mode === "vendedor" || mode === "admin";
  const firstName = profile?.full_name?.split(" ")[0] ?? "membro";

  const { data: counts } = useQuery({
    queryKey: ["dashboard", "counts", user?.id],
    queryFn: () => fetchDashboardCounts(user!.id),
    enabled: Boolean(user),
  });
  const { data: opportunities = [] } = useQuery({
    queryKey: ["listings", "oportunidades"],
    queryFn: () => fetchApprovedListings({ sort: "recent" }),
  });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals", user?.id],
    queryFn: () => fetchMyProposals(user!.id),
    enabled: Boolean(user),
  });
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: Boolean(user),
  });

  const allCards = [
    {
      icon: Handshake,
      title: "Minhas negociações",
      value: counts?.negotiations ?? 0,
      hint: "em andamento",
      to: "/app/negociacoes",
    },
    {
      icon: HeartHandshake,
      title: "Propostas recebidas",
      value: counts?.proposalsReceived ?? 0,
      hint: `${counts?.proposalsWaiting ?? 0} aguardando resposta`,
      to: "/app/propostas",
    },
    {
      icon: ListChecks,
      title: "Anúncios ativos",
      value: counts?.activeListings ?? 0,
      hint: "publicados no catálogo",
      to: "/app/meus-anuncios",
    },
    {
      icon: Heart,
      title: "Favoritos",
      value: counts?.favorites ?? 0,
      hint: "máquinas salvas",
      to: "/app/favoritos",
    },
  ];

  const summaryCards = allCards.filter(
    (card) => isSeller || (card.to !== "/app/meus-anuncios" && card.to !== "/app/propostas"),
  );

  return (
    <AppPage>
      {profile?.status === "pending" && (
        <div className="mb-6 flex gap-4 rounded-md border-l-4 border-clay bg-secondary/60 p-5">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
          <div>
            <h2 className="font-display text-base font-semibold text-forest">Cadastro em análise</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sua conta está em verificação. Você pode explorar o catálogo, mas ainda não pode
              publicar anúncios, enviar propostas ou usar o chat.
            </p>
          </div>
        </div>
      )}
      {(profile?.status === "rejected" || profile?.status === "suspended") && (
        <div className="mb-6 flex gap-4 rounded-md border-l-4 border-destructive bg-destructive/5 p-5">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h2 className="font-display text-base font-semibold text-forest">
              {profile?.status === "rejected" ? "Cadastro não aprovado" : "Conta suspensa"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile?.rejection_reason ?? "Entre em contato com a equipe para os próximos passos."}
            </p>
          </div>
        </div>
      )}

      {/* Saudação */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">
            Olá, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aqui está um resumo dos seus negócios no DDP AGRO.
          </p>
        </div>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          {isSeller ? (
            <Link to="/app/publicar">
              <PlusCircle className="mr-2 h-4 w-4" /> Publicar anúncio
            </Link>
          ) : (
            <Link to="/app/comprar">
              <Tractor className="mr-2 h-4 w-4" /> Buscar máquinas
            </Link>
          )}
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="mt-7 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {summaryCards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="group rounded-lg border border-border bg-card p-5 shadow-[0_1px_3px_oklch(0.3_0.05_250/0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_oklch(0.3_0.05_250/0.35)]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
                <card.icon className="h-5 w-5 text-accent" />
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-4 font-display text-3xl font-bold text-forest">{card.value}</p>
            <p className="mt-0.5 text-sm font-medium text-forest">{card.title}</p>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </Link>
        ))}
      </div>

      {/* Oportunidades */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-forest">Oportunidades para você</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Máquinas publicadas recentemente por vendedores verificados.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/comprar">Ver todas</Link>
          </Button>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.slice(0, 3).map((l, i) => (
            <ListingCard key={l.id} listing={l as never} index={i} />
          ))}
        </div>
      </section>

      {/* Categorias rápidas */}
      <section className="mt-12">
        <h2 className="font-display text-xl font-bold text-forest">Encontre sua próxima máquina</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c, i) => (
            <Link
              key={c.id}
              to="/app/comprar"
              search={{ categoria: c.slug }}
              className="group flex flex-col items-center gap-2 rounded-lg border border-border bg-[oklch(0.97_0.015_235)] p-5 text-center transition-all hover:-translate-y-0.5 hover:border-accent"
            >
              {(() => {
                const Icon = CATEGORY_ICONS[i % CATEGORY_ICONS.length] ?? Tractor;
                return <Icon className="h-6 w-6 text-accent" />;
              })()}
              <span className="text-sm font-semibold text-forest">{c.name}</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                Ver máquinas <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Negociações + atividade */}
      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-forest">Minhas negociações</h2>
            <Link to="/app/negociacoes" className="text-xs font-medium text-accent hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {proposals.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma negociação em andamento. Explore as oportunidades e envie uma proposta.
              </p>
            )}
            {proposals.slice(0, 4).map((p) => {
              const listing = p.listings as {
                title: string;
                slug: string;
                price: number | null;
              } | null;
              return (
                <Link
                  key={p.id}
                  to="/app/mensagens"
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3 transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-forest">
                      {listing?.title ?? "Implemento"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.buyer_id === user?.id ? "Compra" : "Venda"} • Proposta de{" "}
                      {formatBRL(p.amount)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      p.status === "accepted"
                        ? "bg-green-100 text-green-700"
                        : p.status === "rejected"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-secondary text-forest",
                    )}
                  >
                    {PROPOSAL_STATUS_LABELS[p.status] ?? p.status}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold text-forest">Atividade recente</h2>
          <div className="mt-4 space-y-4">
            {notifications.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma atividade por enquanto.
              </p>
            )}
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="flex gap-3">
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    n.read_at ? "bg-border" : "bg-accent",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-forest">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segurança */}
      <section className="mt-12 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <ShieldCheck className="h-5 w-5 text-accent" />
          </span>
          <h2 className="font-display text-lg font-bold text-forest">Negocie com confiança</h2>
        </div>
        <ul className="mt-5 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" /> {item}
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
          O DDP AGRO foi desenvolvido para tornar a negociação de máquinas agrícolas mais segura,
          profissional e transparente.
        </p>
      </section>
    </AppPage>
  );
}
