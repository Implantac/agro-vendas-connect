import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Clock, Copy, CreditCard, FileText, QrCode, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { formatBRL, formatDateTimeBR } from "@/lib/format";
import {
  cancelMembershipRequest,
  confirmMembershipPayment,
  createMembershipRequest,
  fetchMembershipPlans,
  fetchMyMembershipRequests,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  planBenefits,
  REQUEST_STATUS_LABELS,
} from "@/lib/membership-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/membresia")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["plano"] === "string" ? { plano: search["plano"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Minha membresia | DDP AGRO" },
      {
        name: "description",
        content:
          "Acompanhe o pagamento e a análise da sua solicitação de membresia no DDP AGRO.",
      },
      { property: "og:title", content: "Minha membresia | DDP AGRO" },
      {
        property: "og:description",
        content: "Pagamento, análise e liberação do acesso ao marketplace DDP AGRO.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Membresia,
});

const METHODS = [
  { value: "pix", label: "Pix", icon: QrCode, hint: "Aprovação imediata" },
  { value: "boleto", label: "Boleto", icon: FileText, hint: "Compensa em até 3 dias úteis" },
  { value: "card", label: "Cartão", icon: CreditCard, hint: "Cobrança mensal recorrente" },
] as const;

const STEPS = ["Plano", "Pagamento", "Análise", "Acesso liberado"];

function stepIndex(status?: string) {
  if (!status) return 0;
  if (status === "payment_pending") return 1;
  if (status === "in_review") return 2;
  if (status === "approved") return 3;
  return 2;
}

function Membresia() {
  const { plano } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, profile, loading, refreshProfile } = useAuth();
  const [method, setMethod] = useState<string>("pix");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<string | undefined>(plano);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/entrar", search: { redirect: "/membresia" } });
  }, [loading, user, navigate]);

  const { data: plans = [] } = useQuery({
    queryKey: ["membership", "plans"],
    queryFn: fetchMembershipPlans,
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["membership", "my-requests", user?.id],
    queryFn: () => fetchMyMembershipRequests(user!.id),
    enabled: Boolean(user),
  });

  const active = requests.find((r) => r.status !== "cancelled" && r.status !== "rejected");
  const plan = plans.find((p) => p.code === (selected ?? plano)) ?? plans[0];

  const createMutation = useMutation({
    mutationFn: () =>
      createMembershipRequest({
        userId: user!.id,
        plan: plan!,
        method,
        ...(notes ? { notes } : {}),
      }),
    onSuccess: () => {
      toast.success("Solicitação criada", { description: "Conclua o pagamento para seguir." });
      void qc.invalidateQueries({ queryKey: ["membership"] });
    },
    onError: (e: Error) => toast.error("Não foi possível criar a solicitação", { description: e.message }),
  });

  const payMutation = useMutation({
    mutationFn: () => confirmMembershipPayment(active!.id, active!.payment_method ?? method),
    onSuccess: () => {
      toast.success("Pagamento confirmado", { description: "Sua solicitação entrou em análise." });
      void qc.invalidateQueries({ queryKey: ["membership"] });
    },
    onError: (e: Error) => toast.error("Falha ao confirmar o pagamento", { description: e.message }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelMembershipRequest(active!.id),
    onSuccess: () => {
      toast.success("Solicitação cancelada.");
      void qc.invalidateQueries({ queryKey: ["membership"] });
    },
    onError: (e: Error) => toast.error("Não foi possível cancelar", { description: e.message }),
  });

  useEffect(() => {
    if (active?.status === "approved" && profile?.status !== "approved") void refreshProfile();
  }, [active?.status, profile?.status, refreshProfile]);

  const current = stepIndex(active?.status);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">Membresia</span>
        <h1 className="mt-2 font-display text-3xl font-bold text-forest">Minha solicitação</h1>

        <ol className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className={cn(
                "rounded-md border px-3 py-2 text-xs font-semibold",
                i <= current
                  ? "border-accent bg-secondary text-forest"
                  : "border-border text-muted-foreground",
              )}
            >
              {i + 1}. {s}
            </li>
          ))}
        </ol>

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Carregando...</p>}

        {/* Etapa 1 e 2: escolher plano e método */}
        {!isLoading && !active && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-forest">1. Escolha o plano</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p.code)}
                    className={cn(
                      "rounded-md border p-4 text-left transition-colors",
                      plan?.id === p.id ? "border-accent bg-secondary" : "border-border bg-card",
                    )}
                  >
                    <p className="font-display font-semibold text-forest">{p.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatBRL(p.price)}/mês</p>
                  </button>
                ))}
              </div>
              {plan && (
                <ul className="mt-4 space-y-2">
                  {planBenefits(plan).map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-forest">
                2. Forma de pagamento
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "rounded-md border p-4 text-left transition-colors",
                      method === m.value ? "border-accent bg-secondary" : "border-border bg-card",
                    )}
                  >
                    <m.icon className="h-5 w-5 text-accent" />
                    <p className="mt-2 font-semibold text-forest">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-forest" htmlFor="obs">
                Observações para a análise (opcional)
              </label>
              <Textarea
                id="obs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Conte sobre sua operação, revenda ou volume de máquinas."
              />
            </div>

            <Button
              className="bg-forest hover:bg-forest/90"
              disabled={!plan || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Gerando cobrança..." : "Gerar cobrança"}
            </Button>
          </div>
        )}

        {/* Pagamento pendente */}
        {active?.status === "payment_pending" && (
          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold text-forest">
              Pagamento — {active.membership_plans?.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {PAYMENT_METHOD_LABELS[active.payment_method ?? "pix"] ?? "Pix"} •{" "}
              {formatBRL(active.amount)}
            </p>

            <div className="mt-5 rounded-md border border-dashed border-accent/60 bg-secondary/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Código de pagamento
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <code className="break-all text-sm font-semibold text-forest">
                  {active.payment_reference}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(active.payment_reference ?? "");
                    toast.success("Código copiado.");
                  }}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                className="bg-forest hover:bg-forest/90"
                disabled={payMutation.isPending}
                onClick={() => payMutation.mutate()}
              >
                {payMutation.isPending ? "Confirmando..." : "Já efetuei o pagamento"}
              </Button>
              <Button
                variant="ghost"
                className="text-destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                Cancelar solicitação
              </Button>
            </div>
          </div>
        )}

        {/* Em análise */}
        {active?.status === "in_review" && (
          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <Clock className="h-6 w-6 text-accent" />
            <h2 className="mt-3 font-display text-lg font-semibold text-forest">
              Pagamento confirmado — cadastro em análise
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recebemos {formatBRL(active.amount)} em {formatDateTimeBR(active.paid_at)}. A equipe
              conclui a verificação em até 1 dia útil e você recebe um aviso.
            </p>
            <Button asChild variant="outline" className="mt-5">
              <Link to="/aguardando-aprovacao">Ver etapas da análise</Link>
            </Button>
          </div>
        )}

        {/* Aprovada */}
        {active?.status === "approved" && (
          <div className="mt-8 rounded-lg border border-accent bg-secondary/50 p-6">
            <ShieldCheck className="h-6 w-6 text-accent" />
            <h2 className="mt-3 font-display text-lg font-semibold text-forest">
              Membresia aprovada
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Seu acesso está liberado como {active.requested_role === "seller" ? "vendedor" : "comprador"}.
            </p>
            <Button asChild className="mt-5 bg-forest hover:bg-forest/90">
              <Link to="/app">Ir para a área de membros</Link>
            </Button>
          </div>
        )}

        {/* Histórico */}
        {requests.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-lg font-semibold text-forest">Histórico</h2>
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border bg-card">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-forest">
                      {r.membership_plans?.name ?? "Plano"} • {formatBRL(r.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTimeBR(r.created_at)} • Pagamento:{" "}
                      {PAYMENT_STATUS_LABELS[r.payment_status]}
                      {r.review_notes ? ` • ${r.review_notes}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {REQUEST_STATUS_LABELS[r.status]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
