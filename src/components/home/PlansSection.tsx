import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/format";
import {
  fetchMembershipPlans,
  fetchPaymentsEnabled,
  planBenefits,
} from "@/lib/membership-queries";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const PERIOD_LABEL: Record<string, string> = {
  monthly: "por mês",
  quarterly: "por trimestre",
  semiannual: "por semestre",
  yearly: "por ano",
  annual: "por ano",
};

const ROLE_LABEL: Record<string, string> = {
  buyer: "Indicado para quem compra",
  seller: "Indicado para quem vende",
  admin: "Uso interno",
};

export function PlansSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const plansQuery = useQuery({
    queryKey: ["membership", "plans"],
    queryFn: fetchMembershipPlans,
  });
  const { data: paymentsEnabled } = useQuery({
    queryKey: ["app-settings", "payments-enabled"],
    queryFn: fetchPaymentsEnabled,
  });

  const plans = plansQuery.data ?? [];

  function choose(code: string) {
    if (user) void navigate({ to: "/membresia", search: { plano: code } });
    else void navigate({ to: "/cadastro", search: { plano: code } });
  }

  return (
    <section id="planos" className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Membresia</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-forest">
            Escolha como você quer participar do DDP AGRO.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            O acesso é liberado depois do pagamento confirmado e da análise da sua solicitação pela
            equipe DDP AGRO.
          </p>
          {paymentsEnabled === false && (
            <p className="mt-4 rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Pagamento online aguardando configuração. Você pode escolher o plano e solicitar a
              membresia; a equipe orienta sobre a cobrança.
            </p>
          )}
        </div>

        <div className="mt-10">
          {plansQuery.isLoading ? (
            <div className="grid gap-6 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-80 w-full rounded-xl" />
              ))}
            </div>
          ) : plansQuery.isError ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Não foi possível concluir esta operação.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => void plansQuery.refetch()}
                disabled={plansQuery.isFetching}
              >
                Tentar novamente
              </Button>
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Os planos estão sendo preparados.{" "}
              <Link to="/contato" className="font-medium text-forest underline-offset-2 hover:underline">
                Fale com a equipe
              </Link>{" "}
              para saber como participar.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => {
                const benefits = planBenefits(plan);
                const limits: string[] = [];
                if (plan.listing_limit != null)
                  limits.push(`${plan.listing_limit} anúncios ativos`);
                if (plan.machine_limit != null)
                  limits.push(`${plan.machine_limit} máquinas cadastradas`);
                if (plan.commission_percent != null)
                  limits.push(`Comissão de ${plan.commission_percent}% por venda`);
                return (
                  <article
                    key={plan.id}
                    className={cn(
                      "flex flex-col rounded-xl border bg-card p-7 shadow-sm transition-shadow hover:shadow-md",
                      plan.highlight ? "border-accent ring-1 ring-accent/40" : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl font-semibold text-forest">
                          {plan.name}
                        </h3>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {ROLE_LABEL[plan.target_role] ?? ""}
                        </p>
                      </div>
                      {plan.highlight && plan.highlight_label && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                          <Star className="h-3 w-3" aria-hidden /> {plan.highlight_label}
                        </span>
                      )}
                    </div>

                    {plan.description && (
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {plan.description}
                      </p>
                    )}

                    <p className="mt-6 font-display text-3xl font-bold text-forest">
                      {formatBRL(Number(plan.price))}
                      <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                        {PERIOD_LABEL[plan.period] ?? plan.period}
                      </span>
                    </p>

                    {benefits.length > 0 && (
                      <ul className="mt-6 space-y-2.5">
                        {benefits.map((b) => (
                          <li key={b} className="flex items-start gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                            <span className="text-sm text-muted-foreground">{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {limits.length > 0 && (
                      <ul className="mt-5 space-y-1.5 border-t border-border pt-5">
                        {limits.map((l) => (
                          <li key={l} className="text-xs text-muted-foreground">
                            {l}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      className="mt-7 w-full bg-forest hover:bg-forest/90"
                      onClick={() => choose(plan.code)}
                    >
                      Escolher plano
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
