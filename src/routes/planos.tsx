import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { fetchMembershipPlans, planBenefits } from "@/lib/membership-queries";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos de membresia | DDP AGRO" },
      {
        name: "description",
        content:
          "Escolha o plano de membresia do DDP AGRO e negocie máquinas e implementos agrícolas usados com vendedores verificados.",
      },
      { property: "og:title", content: "Planos de membresia | DDP AGRO" },
      {
        property: "og:description",
        content: "Planos para compradores e vendedores do marketplace fechado de implementos agrícolas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Planos,
});

function Planos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["membership", "plans"],
    queryFn: fetchMembershipPlans,
  });

  function choose(code: string) {
    if (user) {
      void navigate({ to: "/membresia", search: { plano: code } });
      return;
    }
    void navigate({ to: "/cadastro", search: { plano: code } });
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">Membresia</span>
        <h1 className="mt-2 font-display text-3xl font-bold text-forest sm:text-4xl">
          Planos do DDP AGRO
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          O DDP AGRO é um marketplace fechado. Escolha o plano, conclua o pagamento e nossa equipe
          analisa seu cadastro antes de liberar o acesso às negociações.
        </p>

        {isLoading && <p className="mt-10 text-sm text-muted-foreground">Carregando planos...</p>}

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-lg border bg-card p-6",
                plan.highlight ? "border-accent shadow-lg" : "border-border",
              )}
            >
              {plan.highlight && (
                <span className="mb-3 w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  Mais escolhido
                </span>
              )}
              <h2 className="font-display text-xl font-bold text-forest">{plan.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              <p className="mt-5 font-display text-3xl font-bold text-forest">
                {formatBRL(plan.price)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">/mês</span>
              </p>
              <ul className="mt-5 flex-1 space-y-3">
                {planBenefits(plan).map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {b}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full bg-forest hover:bg-forest/90"
                onClick={() => choose(plan.code)}
              >
                Solicitar membresia
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <p className="text-sm text-muted-foreground">
            Todo pagamento é seguido de análise documental. Se o cadastro for recusado, o valor é
            estornado integralmente. Já é membro?{" "}
            <Link to="/entrar" className="font-medium text-forest underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
