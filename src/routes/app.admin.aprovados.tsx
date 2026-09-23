import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchApprovedMembers } from "@/lib/admin-queries";
import { formatBRL } from "@/lib/format";
import { reportError } from "@/lib/report-error";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admin/aprovados")({
  head: () => ({
    meta: [
      { title: "Membros aprovados | Admin DDP AGRO" },
      {
        name: "description",
        content: "Acompanhe quem já entrou: perfil, plano vigente e histórico de anúncios.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApprovedMembersPage,
});

const ROLE_LABELS: Record<string, string> = {
  buyer: "Comprador",
  seller: "Vendedor",
  admin: "Administrador",
};

const LISTING_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  in_review: "Em análise",
  approved: "Publicado",
  rejected: "Recusado",
  paused: "Pausado",
  sold: "Vendido",
  archived: "Arquivado",
};

const FILTERS = [
  { value: "", label: "Todos" },
  { value: "seller", label: "Vendedores" },
  { value: "buyer", label: "Compradores" },
  { value: "admin", label: "Administradores" },
] as const;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ApprovedMembersPage() {
  const { isAdmin } = useAuth();
  const [role, setRole] = useState<string>("");
  const [term, setTerm] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "approved-members"],
    enabled: isAdmin,
    queryFn: fetchApprovedMembers,
  });

  const members = useMemo(() => {
    const all = data ?? [];
    const q = term.trim().toLowerCase();
    return all.filter((m) => {
      if (role && m.role !== role) return false;
      if (!q) return true;
      return (
        (m.full_name ?? "").toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q) ||
        (m.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, role, term]);

  if (!isAdmin) {
    return (
      <AppPage>
        <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-8 text-center">
          <h1 className="font-display text-xl font-bold text-forest">Área restrita</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Apenas a administração pode ver os dados de outros membros.
          </p>
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest">Membros aprovados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quem já entrou no marketplace, com perfil, plano vigente e histórico de anúncios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/app/admin/membros">Gerenciar usuários</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/app/admin/membresias">Solicitações de membresia</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => setRole(f.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              role === f.value
                ? "border-forest bg-forest text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nome, e-mail ou cidade"
          className="ml-auto h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm"
        />
      </div>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Carregando membros…</p>
      ) : isError ? (
        <div className="mt-8 rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-foreground">Não foi possível concluir esta operação.</p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => {
              reportError(new Error("fetchApprovedMembers"), {
                operation: "carregar membros aprovados",
              });
              void refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : members.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Nenhum membro aprovado encontrado com esses critérios.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {members.map((m) => {
            const published = m.listings.filter((l) => l.status === "approved").length;
            return (
              <article key={m.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-forest">
                      {m.full_name ?? "Sem nome"}
                    </h2>
                    <p className="text-sm text-muted-foreground">{m.email ?? "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ROLE_LABELS[m.role] ?? m.role}
                      {m.person_type ? ` · ${m.person_type.toUpperCase()}` : ""}
                      {m.city ? ` · ${m.city}` : ""}
                      {m.state ? `/${m.state}` : ""} · Membro desde {formatDate(m.created_at)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background px-3 py-2 text-right">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano</p>
                    <p className="text-sm font-semibold text-foreground">
                      {m.plan ? m.plan.name : "Sem plano registrado"}
                    </p>
                    {m.plan ? (
                      <p className="text-xs text-muted-foreground">
                        {formatBRL(Number(m.plan.price))} · {m.plan.period}
                      </p>
                    ) : null}
                    {m.planApprovedAt ? (
                      <p className="text-xs text-muted-foreground">
                        Liberado em {formatDate(m.planApprovedAt)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Histórico de anúncios · {m.listings.length} no total · {published} publicados
                  </p>
                  {m.listings.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Este membro ainda não criou anúncios.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {m.listings.slice(0, 6).map((l) => (
                        <li
                          key={l.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-foreground">{l.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {LISTING_STATUS_LABELS[l.status] ?? l.status}
                            {l.price !== null ? ` · ${formatBRL(l.price)}` : ""} ·{" "}
                            {formatDate(l.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.listings.length > 6 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Mostrando os 6 anúncios mais recentes.
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppPage>
  );
}
