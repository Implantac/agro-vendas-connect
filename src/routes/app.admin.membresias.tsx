import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL, formatDateTimeBR } from "@/lib/format";
import {
  fetchAdminMembershipRequests,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  reviewMembershipRequest,
} from "@/lib/membership-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admin/membresias")({
  head: () => ({
    meta: [
      { title: "Membresias | Admin DDP AGRO" },
      { name: "description", content: "Análise de solicitações de membresia e pagamentos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminMemberships,
});

const FILTERS = [
  { value: "in_review", label: "Em análise" },
  { value: "payment_pending", label: "Aguardando pagamento" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Recusadas" },
  { value: "", label: "Todas" },
] as const;

function AdminMemberships() {
  const [status, setStatus] = useState<string>("in_review");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin", "memberships", status],
    queryFn: () => fetchAdminMembershipRequests(status || undefined),
  });

  const review = useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      reviewMembershipRequest(id, approve, note),
    onSuccess: () => {
      toast.success("Solicitação analisada.");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error("Não foi possível analisar.", { description: e.message }),
  });

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest">Membresias</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Confira o pagamento, analise os dados e libere o acesso do novo membro.
      </p>

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

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && requests.length === 0 && (
          <p className="rounded-md border border-border bg-card px-5 py-6 text-sm text-muted-foreground">
            Nenhuma solicitação nesta situação.
          </p>
        )}
        {requests.map((r) => (
          <div key={r.id} className="rounded-md border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-forest">
                  {r.profiles?.full_name ?? "Membro"}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({r.requested_role === "seller" ? "vendedor" : "comprador"})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.profiles?.email}
                  {r.profiles?.city ? ` • ${r.profiles.city}/${r.profiles.state ?? ""}` : ""}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {r.membership_plans?.name ?? "Plano"} • {formatBRL(r.amount)} •{" "}
                  {PAYMENT_METHOD_LABELS[r.payment_method ?? ""] ?? "—"} • Pagamento:{" "}
                  {PAYMENT_STATUS_LABELS[r.payment_status]}
                  {r.paid_at ? ` em ${formatDateTimeBR(r.paid_at)}` : ""}
                </p>
                {r.applicant_notes && (
                  <p className="mt-2 max-w-xl text-xs italic text-muted-foreground">
                    “{r.applicant_notes}”
                  </p>
                )}
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                {REQUEST_STATUS_LABELS[r.status]}
              </span>
            </div>

            {(r.status === "in_review" || r.status === "payment_pending") && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Parecer da análise (obrigatório ao recusar)"
                  className="max-w-sm"
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  disabled={review.isPending || r.payment_status !== "paid"}
                  onClick={() =>
                    review.mutate({ id: r.id, approve: true, ...(notes[r.id] ? { note: notes[r.id] } : {}) })
                  }
                >
                  Aprovar membresia
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={review.isPending}
                  onClick={() => {
                    const note = notes[r.id];
                    if (!note) {
                      toast.error("Informe o motivo da recusa.");
                      return;
                    }
                    review.mutate({ id: r.id, approve: false, note });
                  }}
                >
                  Recusar
                </Button>
                {r.payment_status !== "paid" && (
                  <span className="text-xs text-muted-foreground">
                    Aguardando confirmação do pagamento para aprovar.
                  </span>
                )}
              </div>
            )}

            {r.review_notes && (
              <p className="mt-3 text-xs text-muted-foreground">Parecer: {r.review_notes}</p>
            )}
          </div>
        ))}
      </div>
    </AppPage>
  );
}
