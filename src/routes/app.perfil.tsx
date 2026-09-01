import { type FormEvent, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Building2, Save, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchDashboardCounts } from "@/lib/app-queries";
import { BRAZILIAN_STATES } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil | DDP AGRO" },
      { name: "description", content: "Dados profissionais e configurações da conta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Perfil,
});

const PROFILE_STATUS = {
  approved: { label: "Membro aprovado", className: "bg-green-100 text-green-700" },
  pending: { label: "Em análise", className: "bg-secondary text-forest" },
  rejected: { label: "Não aprovado", className: "bg-destructive/10 text-destructive" },
  suspended: { label: "Suspenso", className: "bg-destructive/10 text-destructive" },
} as const;

function Perfil() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
  });

  const { data: counts } = useQuery({
    queryKey: ["dashboard", "counts", user?.id],
    queryFn: () => fetchDashboardCounts(user!.id),
    enabled: Boolean(user),
  });

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        city: form.city || null,
        state: form.state || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar. Tente novamente.");
      return;
    }
    toast.success("Perfil atualizado.");
    void queryClient.invalidateQueries();
  }

  const status = PROFILE_STATUS[profile?.status ?? "pending"];
  const initials = (profile?.full_name ?? "M")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Meu perfil</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Seus dados profissionais e o status da sua conta.
      </p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Resumo */}
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary font-display text-2xl font-bold text-forest">
              {initials}
            </span>
            <h2 className="mt-4 font-display text-lg font-bold text-forest">
              {profile?.full_name ?? "Membro"}
            </h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span
              className={cn(
                "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                status.className,
              )}
            >
              <BadgeCheck className="h-3.5 w-3.5" /> {status.label}
            </span>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-forest">
              <ShieldCheck className="h-4 w-4 text-accent" /> Indicadores
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["Anúncios ativos", counts?.activeListings ?? 0],
                ["Negociações em andamento", counts?.negotiations ?? 0],
                ["Propostas recebidas", counts?.proposalsReceived ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-display font-bold text-forest">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={(e) => void save(e)} className="rounded-lg border border-border bg-card p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-forest">
            <User className="h-4 w-4 text-accent" /> Dados pessoais
          </h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="full_name">Nome completo</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.state}
                onValueChange={(v) => setForm((f) => ({ ...f, state: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-forest">
              <Building2 className="h-4 w-4 text-accent" /> Dados profissionais
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Gerenciados pela equipe DDP AGRO durante a verificação do cadastro.
            </p>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Documento</dt>
                <dd className="font-medium text-forest">{profile?.document ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tipo de conta</dt>
                <dd className="font-medium text-forest capitalize">
                  {profile?.role === "admin"
                    ? "Administrador"
                    : profile?.role === "seller"
                      ? "Vendedor"
                      : "Comprador"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex justify-end border-t border-border pt-6">
            <Button
              type="submit"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={saving}
            >
              <Save className="mr-1.5 h-4 w-4" /> {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </AppPage>
  );
}
