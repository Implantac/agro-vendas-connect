import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, FileCheck2, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/aguardando-aprovacao")({
  head: () => ({
    meta: [
      { title: "Cadastro em análise | DDP AGRO" },
      {
        name: "description",
        content:
          "Seu pedido de membresia no DDP AGRO está em análise pela nossa equipe de verificação.",
      },
      { property: "og:title", content: "Cadastro em análise | DDP AGRO" },
      {
        property: "og:description",
        content: "Analisamos cada membro antes de liberar o acesso ao marketplace.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AwaitingApproval,
});

const STEPS = [
  { icon: FileCheck2, title: "Dados recebidos", text: "Seu cadastro foi registrado com sucesso." },
  { icon: Clock, title: "Verificação em andamento", text: "Conferimos documentos e vínculo comercial." },
  { icon: ShieldCheck, title: "Liberação do acesso", text: "Você recebe um e-mail assim que for aprovado." },
];

function AwaitingApproval() {
  const { profile } = useAuth();

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">
          Membresia
        </span>
        <h1 className="mt-2 font-display text-3xl font-bold text-forest">Cadastro em análise</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {profile?.full_name ? `${profile.full_name}, seu` : "Seu"} pedido de membresia está sendo
          avaliado pela equipe do DDP AGRO. O prazo médio é de 1 dia útil.
        </p>

        <ol className="mt-10 space-y-6">
          {STEPS.map((s) => (
            <li key={s.title} className="flex gap-4 rounded-lg border border-border bg-card p-5">
              <s.icon className="h-6 w-6 shrink-0 text-accent" />
              <div>
                <p className="font-display text-base font-semibold text-forest">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/catalogo">Ver catálogo</Link>
          </Button>
          <Button asChild className="bg-forest hover:bg-forest/90">
            <Link to="/contato">Falar com o suporte</Link>
          </Button>
        </div>
      </div>
    </PublicLayout>
  );
}
