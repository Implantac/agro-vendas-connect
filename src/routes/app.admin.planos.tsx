import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/report-error";
import { PLAN_PUBLIC_SELECT, type MembershipPlan } from "@/lib/membership-queries";

export const Route = createFileRoute("/app/admin/planos")({
  head: () => ({
    meta: [
      { title: "Planos de membresia | Admin DDP AGRO" },
      {
        name: "description",
        content: "Configure nome, preço, benefícios, limites e destaque dos planos do DDP AGRO.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPlans,
});

const PERIODS = [
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "yearly", label: "Anual" },
];

const ROLES = [
  { value: "buyer", label: "Comprador" },
  { value: "seller", label: "Vendedor" },
];

type PlanPatch = Partial<MembershipPlan>;

function numberOrNull(value: string) {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function AdminPlans() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");

  const plansQuery = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_plans")
        .select(PLAN_PUBLIC_SELECT)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as MembershipPlan[];
    },
  });
  const plans = plansQuery.data ?? [];

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    void qc.invalidateQueries({ queryKey: ["membership", "plans"] });
  };

  const save = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: PlanPatch }) => {
      const { error } = await supabase.from("membership_plans").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano atualizado.");
      invalidate();
    },
    onError: (error: Error) =>
      reportError(error, { operation: "admin.plan.update", category: "membership" }),
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const code = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      const { error } = await supabase.from("membership_plans").insert({
        name: name.trim(),
        code,
        price: 0,
        period: "monthly",
        target_role: "buyer",
        active: false,
        sort_order: (plans.at(-1)?.sort_order ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName("");
      toast.success("Plano criado como inativo. Ajuste os dados e ative quando estiver pronto.");
      invalidate();
    },
    onError: (error: Error) =>
      reportError(error, { operation: "admin.plan.create", category: "membership" }),
  });

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest">Planos de membresia</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O que você alterar aqui aparece imediatamente na página inicial e em /planos.
      </p>

      <form
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim().length < 3) {
            toast.error("Informe um nome com pelo menos 3 letras.");
            return;
          }
          create.mutate(newName);
        }}
      >
        <div className="min-w-56 flex-1">
          <Label htmlFor="new-plan">Novo plano</Label>
          <Input
            id="new-plan"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex.: Vendedor Profissional"
          />
        </div>
        <Button type="submit" disabled={create.isPending}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </form>

      {plansQuery.isLoading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : plansQuery.isError ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Não foi possível concluir esta operação.</p>
          <Button className="mt-4" variant="outline" onClick={() => void plansQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : plans.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
          <Wallet className="h-9 w-9 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum plano cadastrado.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSave={(patch) => save.mutate({ id: plan.id, patch })}
              saving={save.isPending}
            />
          ))}
        </ul>
      )}
    </AppPage>
  );
}

function PlanCard({
  plan,
  onSave,
  saving,
}: {
  plan: MembershipPlan;
  onSave: (patch: PlanPatch) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: plan.name,
    description: plan.description ?? "",
    price: String(plan.price ?? ""),
    period: plan.period,
    target_role: plan.target_role as string,
    benefits: Array.isArray(plan.benefits_json)
      ? (plan.benefits_json as string[]).join("\n")
      : "",
    listing_limit: plan.listing_limit == null ? "" : String(plan.listing_limit),
    machine_limit: plan.machine_limit == null ? "" : String(plan.machine_limit),
    commission_percent: plan.commission_percent == null ? "" : String(plan.commission_percent),
    highlight_label: plan.highlight_label ?? "",
    sort_order: String(plan.sort_order ?? 0),
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  function submit() {
    const price = numberOrNull(form.price);
    if (price == null || price < 0) {
      toast.error("Informe um preço válido.");
      return;
    }
    onSave({
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      period: form.period,
      target_role: form.target_role as MembershipPlan["target_role"],
      benefits_json: form.benefits
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean),
      listing_limit: numberOrNull(form.listing_limit),
      machine_limit: numberOrNull(form.machine_limit),
      commission_percent: numberOrNull(form.commission_percent),
      highlight_label: form.highlight_label.trim() || null,
      sort_order: Number(numberOrNull(form.sort_order) ?? 0),
    });
  }

  return (
    <li className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-forest">{plan.name}</p>
          <p className="text-xs text-muted-foreground">Código: {plan.code}</p>
        </div>
        <div className="flex items-center gap-5">
          <label className="flex items-center gap-2 text-sm text-forest">
            <Switch
              checked={plan.highlight}
              onCheckedChange={(highlight) => onSave({ highlight })}
            />
            Destaque
          </label>
          <label className="flex items-center gap-2 text-sm text-forest">
            <Switch checked={plan.active} onCheckedChange={(active) => onSave({ active })} />
            {plan.active ? "Ativo" : "Inativo"}
          </label>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div>
          <Label>Perfil indicado</Label>
          <Select value={form.target_role} onValueChange={(v) => set({ target_role: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Preço (R$)</Label>
          <Input
            inputMode="decimal"
            value={form.price}
            onChange={(e) => set({ price: e.target.value })}
          />
        </div>
        <div>
          <Label>Periodicidade</Label>
          <Select value={form.period} onValueChange={(v) => set({ period: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Descrição</Label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Benefícios (um por linha)</Label>
          <Textarea
            rows={4}
            value={form.benefits}
            onChange={(e) => set({ benefits: e.target.value })}
          />
        </div>
        <div>
          <Label>Limite de anúncios</Label>
          <Input
            inputMode="numeric"
            placeholder="Sem limite"
            value={form.listing_limit}
            onChange={(e) => set({ listing_limit: e.target.value })}
          />
        </div>
        <div>
          <Label>Limite de máquinas</Label>
          <Input
            inputMode="numeric"
            placeholder="Sem limite"
            value={form.machine_limit}
            onChange={(e) => set({ machine_limit: e.target.value })}
          />
        </div>
        <div>
          <Label>Comissão (%)</Label>
          <Input
            inputMode="decimal"
            placeholder="Não informada"
            value={form.commission_percent}
            onChange={(e) => set({ commission_percent: e.target.value })}
          />
        </div>
        <div>
          <Label>Rótulo do destaque</Label>
          <Input
            placeholder="Ex.: Mais escolhido"
            value={form.highlight_label}
            onChange={(e) => set({ highlight_label: e.target.value })}
          />
        </div>
        <div>
          <Label>Ordem de exibição</Label>
          <Input
            inputMode="numeric"
            value={form.sort_order}
            onChange={(e) => set({ sort_order: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={submit} disabled={saving}>
          Salvar plano
        </Button>
      </div>
    </li>
  );
}
