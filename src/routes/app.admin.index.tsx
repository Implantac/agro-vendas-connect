import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, ShieldAlert, Users } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { fetchAdminListings, fetchAdminMembers, fetchAdminOverview } from "@/lib/admin-queries";

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

function AdminHome() {
  const { data: overview } = useQuery({ queryKey: ["admin", "overview"], queryFn: fetchAdminOverview });
  const { data: pendingMembers = [] } = useQuery({
    queryKey: ["admin", "members", "pending"],
    queryFn: () => fetchAdminMembers("pending"),
  });
  const { data: pendingListings = [] } = useQuery({
    queryKey: ["admin", "listings", "in_review"],
    queryFn: () => fetchAdminListings("in_review"),
  });

  const cards = [
    { label: "Membros", value: overview?.members ?? 0 },
    { label: "Vendedores", value: overview?.sellers ?? 0 },
    { label: "Compradores", value: overview?.buyers ?? 0 },
    { label: "Pendências", value: (overview?.pendingMembers ?? 0) + (overview?.pendingListings ?? 0) },
  ];

  return (
    <AppPage>
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          DDP AGRO — Administrador
        </p>
        <h1 className="font-display text-2xl font-bold text-forest">Command Center</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-card p-5">
            <p className="font-display text-3xl font-bold text-forest">{c.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-forest">
              <Users className="h-4 w-4 text-accent" /> Membros aguardando análise
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/admin/membros">
                Ver todos <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {pendingMembers.slice(0, 5).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>
                  <span className="block font-medium text-forest">{m.full_name}</span>
                  <span className="block text-xs text-muted-foreground">{m.email}</span>
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link to="/app/admin/membros">Analisar</Link>
                </Button>
              </li>
            ))}
            {pendingMembers.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">Nenhum membro pendente.</li>
            )}
          </ul>
        </div>

        <div className="rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="inline-flex items-center gap-2 font-display text-sm font-semibold text-forest">
              <ClipboardList className="h-4 w-4 text-accent" /> Anúncios aguardando aprovação
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/app/admin/anuncios">
                Moderar <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {pendingListings.slice(0, 5).map((l) => (
              <li key={l.id} className="px-5 py-3 text-sm">
                <span className="block font-medium text-forest">{l.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {l.city ?? "—"} {l.state ? `- ${l.state}` : ""}
                </span>
              </li>
            ))}
            {pendingListings.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">Nenhum anúncio em análise.</li>
            )}
          </ul>
        </div>
      </section>

      <p className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="h-4 w-4" /> Todas as ações administrativas ficam registradas na auditoria.
      </p>
    </AppPage>
  );
}
