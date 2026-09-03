import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["redirect"] === "string" && search["redirect"].startsWith("/")
      ? { redirect: search["redirect"] }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "Entrar | DDP AGRO" },
      {
        name: "description",
        content: "Acesse sua conta DDP AGRO para negociar implementos e máquinas agrícolas.",
      },
      { property: "og:title", content: "Entrar | DDP AGRO" },
      { property: "og:description", content: "Acesso restrito a membros aprovados do DDP AGRO." },
    ],
  }),
  component: Entrar,
});

function Entrar() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar", { description: error.message });
      return;
    }
    if (redirect && redirect.startsWith("/")) {
      window.location.href = redirect;
      return;
    }
    void navigate({ to: "/app" });
  }

  async function google() {
    if (redirect) sessionStorage.setItem("ddp:redirect", redirect);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Falha no login com Google");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/app" });
  }

  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-forest">Entrar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Área restrita a membros do DDP AGRO.
        </p>

        {redirect && (
          <div className="mt-6 rounded-md border border-accent/40 bg-secondary/60 p-4 text-sm text-forest">
            <p className="font-semibold">Conteúdo exclusivo para membros</p>
            <p className="mt-1 text-muted-foreground">
              Para acessar este produto e interagir com o vendedor, entre na sua conta ou{" "}
              <Link to="/cadastro" className="font-medium text-forest underline">
                cadastre-se
              </Link>{" "}
              para contratar o serviço.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="senha">Senha</Label>
              <Link
                to="/recuperar-senha"
                className="text-xs font-medium text-forest underline underline-offset-2"
              >
                Esqueci minha senha
              </Link>
            </div>

              id="senha"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-forest hover:bg-forest/90"
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" onClick={() => void google()}>
          Continuar com Google
        </Button>

        <div className="mt-8 rounded-lg border border-border bg-secondary/40 p-5">
          <p className="font-display text-base font-semibold text-forest">Ainda não é membro?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            O DDP AGRO é um marketplace fechado: cada comprador e vendedor passa por verificação
            antes de negociar.
          </p>
          <Button asChild className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/cadastro">Solicitar membresia</Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Já solicitou?{" "}
            <Link to="/aguardando-aprovacao" className="font-medium text-forest underline">
              Acompanhar análise
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
