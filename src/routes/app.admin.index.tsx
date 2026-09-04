import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  CreditCard,
  FileCheck2,
  Handshake,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { fetchAdminConsole } from "@/lib/admin-queries";
import { formatBRL, formatDateTimeBR, PROPOSAL_STATUS_LABELS } from "@/lib/format";
import type { AppRoute } from "@/config/navigation";

export const Route = createFileRoute("/app/admin/")({
  head: () => ({
    meta: [
      { title: "Command Center | DDP AGRO" },
      { name: "description", content: "Painel administrativo do marketplace DDP AGRO." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHome,
});

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function AdminHome() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "console"], queryFn: fetchAdminConsole });

  const a = data?.alerts;
  const t = data?.trust;

  const alerts: { label: string; value: number; to: AppRoute; icon: typeof Users }[] = [
    { label: "Membros aguardando análise", value: a?.pendingMembers ?? 0, to: "/app/admin/membros", icon: Users },
    { label: "Anúncios em moderação", value: a?.listingsInReview ?? 0, to: "/app/admin/anuncios", icon: ClipboardList },
    { label: "Membresias a validar", value: a?.membershipRequests ?? 0, to: "/app/admin/membresias", icon: FileCheck2 },
    { label: "Denúncias em aberto", value: a?.openReports ?? 0, to: "/app/admin/denuncias", icon: AlertTriangle },
    { label: "Pedidos sem pagamento", value: a?.ordersAwaitingPayment ?? 0, to: "/app/admin/pedidos", icon: CreditCard },
  ];

  const totalAlerts = alerts.reduce((s, x) => s + x.value, 0);

  const badges = [
    {
      label: "Membros aprovados",
      value: `${t?.approvedMembers ?? 0}/${t?.totalMembers ?? 0}`,
      pct: pct(t?.approvedMembers ?? 0, t?.totalMembers ?? 0),
    },
    {
      label: "Vendedores verificados",
      value: `${t?.verifiedSellers ?? 0}/${t?.totalSellers ?? 0}`,
      pct: pct(t?.verifiedSellers ?? 0, t?.totalSellers ?? 0),
    },
    {
      label: "Anúncios aprovados",
      value: `${t?.approvedListings ?? 0}/${t?.totalListings ?? 0}`,
      pct: pct(t?.approvedListings ?? 0, t?.totalListings ?? 0),
    },
    {
      label: "Documentos pendentes",
      value: String(t?.documentsPending ?? 0),
      pct: t?.documentsPending ? 0 : 100,
    },
  ];

  const pipeline = [
    { label: "Abertas", value: data?.pipeline.open ?? 0 },
    { label: "Contrapropostas", value: data?.pipeline.countered ?? 0 },
    { label: "Aceitas", value: data?.pipeline.accepted ?? 0 },
    { label: "Concluídas", value: data?.pipeline.closed ?? 0 },
  ];

  return (
    <AppPage>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            DDP AGRO — Administrador
          </p>
          <h1 className="font-display text-2xl font-bold text-forest">Command Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalAlerts === 0
              ? "Nenhuma pendência aberta no momento."
              : `${totalAlerts} pendência(s) aguardando sua ação.`}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-5 py-3 text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Volume negociado</p>
          <p className="font-display text-2xl font-bold text-forest">{formatBRL(data?.gmv ?? 0)}</p>
        </div>
      </header>

      {/* Alertas operacionais */}
      <section>
        <h2 className="mb-3 inline-flex items-center gap-2 font-display text-sm font-semibold text-forest">
          <ShieldAlert className="h-4 w-4 text-accent" /> Alertas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {alerts.map((item) => {
            const Icon = item.icon;
            const active = item.value > 0;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`rounded-md border p-4 transition hover:border-accent ${
                  active ? "border-accent/50 bg-accent/5" : "border-border bg-card"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-accent" : "text-muted-foreground"}`} />
                <p className="mt-2 font-display text-3xl font-bold text-forest">
                  {isLoading ? "—" : item.value}
                </p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{item.label}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Confiança */}
      <section className="mt-8">
        <h2 className="mb-3 inline-flex items-center gap-2 font-display text-sm font-semibold text-forest">
          <ShieldCheck className="h-4 w-4 text-accent" /> Confiança da plataforma
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {badges.map((b) => (
            <div key={b.label} className="rounded-md border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{b.label}</span>
                <BadgeCheck className={`h-4 w-4 ${b.pct >= 80 ? "text-accent" : "text-muted-foreground/50"}`} />
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-forest">{b.value}</p>
              <div className="mt-3 h-1.5 w-full rounded-full bg-secondary">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Negociações em uma única tela */}
      <section className="mt-8 rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-forest">
            <Handshake className="h-4 w-4 text-accent" /> Fluxo de negociações
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/admin/negociacoes">
              Ver todas <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 divide-border border-b border-border sm:grid-cols-4 sm:divide-x">
          {pipeline.map((s) => (
            <div key={s.label} className="px-5 py-4">
              <p className="font-display text-2xl font-bold text-forest">{s.value}</p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <ul className="divide-y divide-border">
          {(data?.negotiations ?? []).map((n) => (
            <li key={n.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-forest">
                  {PROPOSAL_STATUS_LABELS[n.status] ?? n.status}
                </span>
                <p className="mt-1.5 truncate font-display text-sm font-semibold text-forest">
                  {n.title ?? "Implemento"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Atualizada em {formatDateTimeBR(n.updated_at)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-display text-base font-bold text-forest">{formatBRL(n.amount)}</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/app/negociacao/$id" params={{ id: n.id }}>
                    Abrir
                  </Link>
                </Button>
              </div>
            </li>
          ))}
          {!isLoading && (data?.negotiations.length ?? 0) === 0 && (
            <li className="px-5 py-8 text-sm text-muted-foreground">Nenhuma negociação registrada ainda.</li>
          )}
        </ul>
      </section>

      <p className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="h-4 w-4" /> Todas as ações administrativas ficam registradas na auditoria.
      </p>
    </AppPage>
  );
}
