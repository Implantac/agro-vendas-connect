import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { fetchAdminMembers, setMemberRole, setMemberStatus } from "@/lib/admin-queries";
import { formatBRL } from "@/lib/format";
import {
  fetchAdminMembershipRequests,
  PAYMENT_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
} from "@/lib/membership-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admin/membros")({
  head: () => ({
    meta: [
      { title: "Membros | Admin DDP AGRO" },
      { name: "description", content: "Análise e aprovação de membros da plataforma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminMembers,
});

const FILTERS = [
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Rejeitados" },
  { value: "suspended", label: "Suspensos" },
  { value: "", label: "Todos" },
] as const;

const ROLES = [
  { value: "buyer", label: "Comprador" },
  { value: "seller", label: "Vendedor" },
  { value: "admin", label: "Administrador" },
] as const;


function AdminMembers() {
  const [status, setStatus] = useState<string>("pending");
  const qc = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin", "members", status],
    queryFn: () => fetchAdminMembers(status || undefined),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["admin", "memberships", "all"],
    queryFn: () => fetchAdminMembershipRequests(),
  });

  const requestByUser = new Map(requests.map((r) => [r.user_id, r]));
  const pendingReview = requests.filter((r) => r.status === "in_review").length;

  const mutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: "approved" | "rejected" | "suspended" }) =>
      setMemberStatus(id, next),
    onSuccess: () => {
      toast.success("Status do membro atualizado.");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error("Não foi possível atualizar.", { description: e.message }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "buyer" | "seller" | "admin" }) =>
      setMemberRole(id, role),
    onSuccess: () => {
      toast.success("Perfil de acesso atualizado.");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error("Não foi possível alterar o perfil.", { description: e.message }),
  });


  return (
    <AppPage>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest">Membros</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analise solicitações e controle o acesso ao marketplace privado.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/app/admin/membresias">
            Solicitações de membresia
            {pendingReview > 0 ? ` (${pendingReview})` : ""}
          </Link>
        </Button>
      </div>


      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatus(f.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              status === f.value
                ? "border-accent bg-secondary text-forest"
                : "border-border text-muted-foreground hover:text-forest",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-border bg-card">
        <ul className="divide-y divide-border">
          {isLoading && <li className="px-5 py-6 text-sm text-muted-foreground">Carregando...</li>}
          {!isLoading && members.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted-foreground">Nenhum membro nesta situação.</li>
          )}
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-medium text-forest">{m.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.email} • {m.role} • {m.status}
                  {m.city ? ` • ${m.city}/${m.state ?? ""}` : ""}
                </p>
                {(() => {
                  const req = requestByUser.get(m.id);
                  if (!req) {
                    return (
                      <p className="mt-1 text-xs text-muted-foreground">Sem solicitação de membresia.</p>
                    );
                  }
                  return (
                    <p className="mt-1 text-xs font-medium text-forest">
                      {req.membership_plans?.name ?? "Plano"} • {formatBRL(req.amount)} •{" "}
                      {REQUEST_STATUS_LABELS[req.status]} • Pagamento:{" "}
                      {PAYMENT_STATUS_LABELS[req.payment_status]}
                    </p>
                  );
                })()}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Perfil:</span>
                <div className="flex overflow-hidden rounded-full border border-border">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      disabled={roleMutation.isPending || m.role === r.value}
                      onClick={() => roleMutation.mutate({ id: m.id, role: r.value })}
                      className={cn(
                        "px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-default",
                        m.role === r.value
                          ? "bg-forest text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-forest",
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">

                <Button
                  size="sm"
                  disabled={mutation.isPending || m.status === "approved"}
                  onClick={() => mutation.mutate({ id: m.id, next: "approved" })}
                >
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutation.isPending || m.status === "rejected"}
                  onClick={() => mutation.mutate({ id: m.id, next: "rejected" })}
                >
                  Rejeitar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={mutation.isPending || m.status === "suspended"}
                  onClick={() => mutation.mutate({ id: m.id, next: "suspended" })}
                >
                  Suspender
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppPage>
  );
}
