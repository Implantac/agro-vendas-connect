import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha | DDP AGRO" },
      { name: "description", content: "Crie uma nova senha para acessar sua conta DDP AGRO." },
      { property: "og:title", content: "Redefinir senha | DDP AGRO" },
      { property: "og:description", content: "Defina uma nova senha de acesso ao DDP AGRO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
      setReady(true);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível redefinir a senha", { description: error.message });
      return;
    }
    toast.success("Senha atualizada com sucesso");
    void navigate({ to: "/app" });
  }

  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-forest">Redefinir senha</h1>

        {!ready ? (
          <p className="mt-4 text-sm text-muted-foreground">Validando o link...</p>
        ) : !hasSession ? (
          <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-5 text-sm">
            <p className="font-semibold text-forest">Link inválido ou expirado</p>
            <p className="mt-1 text-muted-foreground">
              Solicite um novo link de recuperação para continuar.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/recuperar-senha">Solicitar novo link</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar">Confirmar nova senha</Label>
              <Input
                id="confirmar"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-forest hover:bg-forest/90">
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        )}
      </div>
    </PublicLayout>
  );
}
