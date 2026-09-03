import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/cadastro")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["plano"] === "string" ? { plano: search["plano"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Solicitar acesso | DDP AGRO" },
      {
        name: "description",
        content:
          "Solicite acesso ao DDP AGRO como comprador ou vendedor. Todo cadastro passa por verificação da equipe.",
      },
      { property: "og:title", content: "Solicitar acesso | DDP AGRO" },
      {
        property: "og:description",
        content: "Cadastro verificado para compradores e vendedores de máquinas agrícolas.",
      },
    ],
  }),
  component: Cadastro,
});

function Cadastro() {
  const navigate = useNavigate();
  const { plano } = Route.useSearch();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
    state: "",
    document: "",
  });
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [personType, setPersonType] = useState<"pf" | "pj">("pf");
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      toast.error("É necessário aceitar os termos e a política de privacidade.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: {
          full_name: form.full_name,
          phone: form.phone,
          city: form.city,
          state: form.state.toUpperCase(),
          document_number: form.document,
          person_type: personType,
          requested_role: role,
        },
      },
    });
    if (error) {
      setLoading(false);
      toast.error("Não foi possível concluir o cadastro", { description: error.message });
      return;
    }
    if (data.user && data.session) {
      try {
        await recordLegalAcceptances(data.user.id);
      } catch {
        // o aceite será solicitado novamente no primeiro acesso
      }
    }
    setLoading(false);
    toast.success("Cadastro criado", {
      description: "Agora conclua o pagamento da membresia para seguir para a análise.",
    });
    void navigate({ to: "/membresia", search: plano ? { plano } : {} });
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-forest">Solicitar membresia</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O DDP AGRO é uma plataforma fechada. O fluxo tem três etapas: cadastro, pagamento do plano
          e análise da equipe antes da liberação para negociar.
        </p>

        <ol className="mt-6 grid grid-cols-3 gap-2 text-xs font-semibold">
          {["1. Cadastro", "2. Pagamento", "3. Análise"].map((s, i) => (
            <li
              key={s}
              className={`rounded-md border px-3 py-2 ${
                i === 0 ? "border-accent bg-secondary text-forest" : "border-border text-muted-foreground"
              }`}
            >
              {s}
            </li>
          ))}
        </ol>

        <p className="mt-4 text-sm text-muted-foreground">
          Ainda não escolheu o plano?{" "}
          <Link to="/planos" className="font-medium text-forest underline">
            Ver planos de membresia
          </Link>
        </p>


        <form onSubmit={submit} className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Quero atuar como</Label>
              <div className="flex gap-2">
                {(
                  [
                    ["buyer", "Comprador"],
                    ["seller", "Vendedor"],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRole(v)}
                    className={`flex-1 rounded-sm border px-3 py-2 text-sm ${
                      role === v
                        ? "border-forest bg-forest text-primary-foreground"
                        : "border-input bg-background text-foreground"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de pessoa</Label>
              <div className="flex gap-2">
                {(
                  [
                    ["pf", "Física"],
                    ["pj", "Jurídica"],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPersonType(v)}
                    className={`flex-1 rounded-sm border px-3 py-2 text-sm ${
                      personType === v
                        ? "border-forest bg-forest text-primary-foreground"
                        : "border-input bg-background text-foreground"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nome">{personType === "pj" ? "Razão social" : "Nome completo"}</Label>
              <Input
                id="nome"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc">{personType === "pj" ? "CNPJ" : "CPF"}</Label>
              <Input
                id="doc"
                value={form.document}
                onChange={(e) => set("document", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tel">Telefone</Label>
              <Input id="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Input
                id="uf"
                maxLength={2}
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                required
              />
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
            />
            <span>
              Li e aceito os{" "}
              <Link to="/termos-de-uso" className="text-forest underline">
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link to="/politica-de-privacidade" className="text-forest underline">
                Política de Privacidade
              </Link>
              .
            </span>
          </label>

          <Button type="submit" disabled={loading} className="bg-forest hover:bg-forest/90">
            {loading ? "Enviando..." : "Solicitar acesso"}
          </Button>
        </form>

        <p className="mt-8 text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/entrar" className="font-medium text-forest underline">
            Entrar
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
}
