import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Cog,
  Droplets,
  Eye,
  Sprout,
  Tractor,
  Truck,
  Users,
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
import {
  fetchDashboardCounts,
  fetchMyListings,
  fetchMyProposals,
  fetchNotifications,
  fetchSellerLeads,
} from "@/lib/app-queries";
import { fetchApprovedListings, fetchCategories } from "@/lib/queries";
import { formatBRL, LISTING_STATUS_LABELS, PROPOSAL_STATUS_LABELS } from "@/lib/format";
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

const OPEN_STATUSES = ["open", "countered"];

function Dashboard() {
  const { mode } = useAppRole();
  const isSeller = mode === "vendedor" || mode === "admin";
  return isSeller ? <SellerDashboard /> : <BuyerDashboard />;
}

/* ---------------------------------------------------------------- shared */

function StatusBanners() {
  const { profile } = useAuth();
  return (
    <>
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
    </>
  );
}

type KpiCard = {
  icon: typeof Handshake;
  title: string;
  value: string | number;
  hint: string;
  to: string;
};

function KpiGrid({ cards }: { cards: KpiCard[] }) {
  return (
    <div className="mt-7 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
      {cards.map((card) => (
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
  );
}

function RecentActivity({ userId }: { userId?: string | undefined }) {
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: Boolean(userId),
  });
  return (
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
  );
}

function TrustSection() {
  return (
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
  );
}

/* --------------------------------------------------------------- vendedor */

function SellerDashboard() {
  const { user, profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] ?? "membro";

  const { data: leads = [] } = useQuery({
    queryKey: ["seller-leads", user?.id],
    queryFn: () => fetchSellerLeads(user!.id),
    enabled: Boolean(user),
  });
  const { data: listings = [] } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: () => fetchMyListings(user!.id),
    enabled: Boolean(user),
  });
  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals", user?.id],
    queryFn: () => fetchMyProposals(user!.id),
    enabled: Boolean(user),
  });

  const salesProposals = proposals.filter((p) => p.seller_id === user?.id);
  const openSales = salesProposals.filter((p) => OPEN_STATUSES.includes(p.status));
  const closedSales = salesProposals.filter((p) => p.status === "accepted");
  const waiting = salesProposals.filter((p) => p.status === "open").length;

  const activeListings = listings.filter((l) => l.status === "approved").length;
  const interested = leads.reduce((sum, l) => sum + l.favorites + l.conversations, 0);
  const contacts = leads.reduce((sum, l) => sum + l.conversations, 0);
  const sum = (rows: typeof salesProposals) =>
    rows.reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
  const interestedValue = leads
    .filter((l) => l.favorites + l.conversations > 0)
    .reduce((acc, l) => acc + Number(l.price ?? 0), 0);

  const cards: KpiCard[] = [
    {
      icon: ListChecks,
      title: "Anúncios ativos",
      value: activeListings,
      hint: "publicados no catálogo",
      to: "/app/meus-anuncios",
    },
    {
      icon: Users,
      title: "Interessados",
      value: interested,
      hint: "favoritos e conversas",
      to: "/app/leads",
    },
    {
      icon: HeartHandshake,
      title: "Propostas recebidas",
      value: salesProposals.length,
      hint: `${waiting} aguardando resposta`,
      to: "/app/negociacoes",
    },
    {
      icon: Handshake,
      title: "Negociações em andamento",
      value: openSales.length,
      hint: `${formatBRL(sum(openSales))} em negociação`,
      to: "/app/negociacoes",
    },
    {
      icon: CheckCircle2,
      title: "Vendas concluídas",
      value: closedSales.length,
      hint: formatBRL(sum(closedSales)),
      to: "/app/pedidos",
    },
  ];

  const pipeline = [
    { label: "Interessados", count: interested, value: interestedValue, to: "/app/leads" },
    { label: "Contato", count: contacts, value: interestedValue, to: "/app/mensagens" },
    {
      label: "Proposta",
      count: salesProposals.length,
      value: sum(salesProposals),
      to: "/app/negociacoes",
    },
    { label: "Negociação", count: openSales.length, value: sum(openSales), to: "/app/negociacoes" },
    { label: "Fechado", count: closedSales.length, value: sum(closedSales), to: "/app/pedidos" },
  ] as const;

  const opportunities = leads
    .filter((l) => l.favorites + l.conversations + l.openProposals > 0)
    .slice(0, 3);

  return (
    <AppPage>
      <StatusBanners />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">
            Olá, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe seus anúncios, interessados e negociações no DDP AGRO.
          </p>
        </div>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/app/publicar">
            <PlusCircle className="mr-2 h-4 w-4" /> Publicar anúncio
          </Link>
        </Button>
      </div>

      <KpiGrid cards={cards} />

      {/* Pipeline de vendas */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-forest">Meu pipeline</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Do primeiro interesse ao negócio fechado.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/desempenho">
              <BarChart3 className="mr-2 h-4 w-4" /> Desempenho
            </Link>
          </Button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {pipeline.map((stage) => (
            <Link
              key={stage.label}
              to={stage.to}
              className="rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-accent"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {stage.label}
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-forest">{stage.count}</p>
              <p className="text-xs text-muted-foreground">{formatBRL(stage.value)}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Meus anúncios */}
      <section className="mt-12 rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-forest">Meus anúncios</h2>
          <Link to="/app/meus-anuncios" className="text-xs font-medium text-accent hover:underline">
            Ver todos os anúncios →
          </Link>
        </div>
        {listings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Você ainda não publicou nenhuma máquina. Publique seu primeiro anúncio para começar a
            receber interessados.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 font-semibold">Máquina</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Interessados</th>
                  <th className="pb-2 font-semibold">Propostas</th>
                  <th className="pb-2 font-semibold">Visualizações</th>
                </tr>
              </thead>
              <tbody>
                {listings.slice(0, 5).map((l) => {
                  const lead = leads.find((x) => x.id === l.id);
                  return (
                    <tr key={l.id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-forest">{l.title}</td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {LISTING_STATUS_LABELS[l.status] ?? l.status}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">
                        {(lead?.favorites ?? 0) + (lead?.conversations ?? 0)}
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground">{lead?.proposals ?? 0}</td>
                      <td className="py-2.5 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5" /> {l.views_count ?? 0}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Oportunidades de venda + atividade */}
      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-forest">Oportunidades de venda</h2>
              <p className="text-xs text-muted-foreground">
                Compradores demonstraram interesse nos seus anúncios.
              </p>
            </div>
            <Link to="/app/leads" className="text-xs font-medium text-accent hover:underline">
              Ver interessados →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {opportunities.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Ainda não há interessados nos seus anúncios.
              </p>
            )}
            {opportunities.map((l) => (
              <Link
                key={l.id}
                to="/app/leads"
                className="block rounded-md border border-border p-3 transition-colors hover:border-accent"
              >
                <p className="truncate text-sm font-semibold text-forest">{l.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {l.favorites + l.conversations} compradores interessados
                  {l.openProposals > 0 && ` • ${l.openProposals} proposta(s) aguardando resposta`}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-forest">{formatBRL(l.price)}</p>
              </Link>
            ))}
          </div>
        </div>

        <RecentActivity userId={user?.id} />
      </section>

      <TrustSection />
    </AppPage>
  );
}

/* -------------------------------------------------------------- comprador */

function BuyerDashboard() {
  const { user, profile } = useAuth();
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

  const purchases = proposals.filter((p) => p.buyer_id === user?.id);

  const cards: KpiCard[] = [
    {
      icon: Handshake,
      title: "Minhas compras em negociação",
      value: purchases.filter((p) => OPEN_STATUSES.includes(p.status)).length,
      hint: "propostas enviadas em aberto",
      to: "/app/negociacoes",
    },
    {
      icon: Heart,
      title: "Favoritos",
      value: counts?.favorites ?? 0,
      hint: "máquinas salvas",
      to: "/app/favoritos",
    },
    {
      icon: ListChecks,
      title: "Pedidos",
      value: purchases.filter((p) => p.status === "accepted").length,
      hint: "compras aceitas",
      to: "/app/pedidos",
    },
  ];

  return (
    <AppPage>
      <StatusBanners />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">
            Olá, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Encontre máquinas, acompanhe favoritos e suas negociações de compra.
          </p>
        </div>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/app/comprar">
            <Tractor className="mr-2 h-4 w-4" /> Buscar máquinas
          </Link>
        </Button>
      </div>

      <KpiGrid cards={cards} />

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

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-forest">Minhas compras</h2>
            <Link to="/app/negociacoes" className="text-xs font-medium text-accent hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {purchases.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma negociação em andamento. Explore as oportunidades e envie uma proposta.
              </p>
            )}
            {purchases.slice(0, 4).map((p) => {
              const listing = p.listings as { title: string } | null;
              return (
                <Link
                  key={p.id}
                  to="/app/negociacoes"
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3 transition-colors hover:border-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-forest">
                      {listing?.title ?? "Implemento"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Compra • Proposta de {formatBRL(p.amount)}
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

        <RecentActivity userId={user?.id} />
      </section>

      <TrustSection />
    </AppPage>
  );
}
