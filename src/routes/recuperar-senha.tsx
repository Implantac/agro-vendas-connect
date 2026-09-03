import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha | DDP AGRO" },
      {
        name: "description",
        content: "Receba um link seguro para redefinir a senha da sua conta DDP AGRO.",
      },
      { property: "og:title", content: "Recuperar senha | DDP AGRO" },
      { property: "og:description", content: "Redefina o acesso à sua conta DDP AGRO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecuperarSenha,
});

function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value || value.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Informe um e-mail válido");
      return;
    }
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(value, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    // Resposta neutra: evita enumeração de usuários.
    setSent(true);
  }

  return (
    <PublicLayout>
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20 sm:px-6">
        <h1 className="font-display text-3xl font-bold text-forest">Recuperar senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Informe o e-mail cadastrado e enviaremos um link para você criar uma nova senha.
        </p>

        {sent ? (
          <div className="mt-8 rounded-lg border border-border bg-secondary/40 p-5 text-sm text-forest">
            <p className="font-semibold">Verifique sua caixa de entrada</p>
            <p className="mt-1 text-muted-foreground">
              Se houver uma conta associada a esse e-mail, o link de redefinição chegará em
              instantes. Confira também a pasta de spam.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/entrar">Voltar para o login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-forest hover:bg-forest/90">
              {loading ? "Enviando..." : "Enviar link de redefinição"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Lembrou a senha?{" "}
              <Link to="/entrar" className="font-medium text-forest underline">
                Entrar
              </Link>
            </p>
          </form>
        )}
      </div>
    </PublicLayout>
  );
}
