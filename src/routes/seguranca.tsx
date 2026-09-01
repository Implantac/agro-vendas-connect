import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Lock, EyeOff, FileWarning } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/layout/PublicLayout";

export const Route = createFileRoute("/seguranca")({
  head: () => ({
    meta: [
      { title: "Negociação segura | DDP AGRO" },
      {
        name: "description",
        content:
          "Boas práticas de negociação segura, proteção de dados e prevenção a fraudes na compra e venda de implementos agrícolas.",
      },
      { property: "og:title", content: "Negociação segura | DDP AGRO" },
      {
        property: "og:description",
        content: "Como o DDP AGRO protege membros, dados e negociações.",
      },
    ],
  }),
  component: Seguranca,
});

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Membros verificados",
    text: "Toda conta passa por análise documental. Contas suspeitas são suspensas imediatamente.",
  },
  {
    icon: Lock,
    title: "Dados protegidos",
    text: "Documentos ficam em armazenamento restrito e nunca são expostos publicamente na plataforma.",
  },
  {
    icon: EyeOff,
    title: "Contato controlado",
    text: "O chat é liberado apenas entre as partes de uma negociação ativa, com registro de mensagens.",
  },
  {
    icon: FileWarning,
    title: "Denúncia rápida",
    text: "Qualquer membro pode reportar um anúncio suspeito e a moderação avalia em seguida.",
  },
];

const RULES = [
  "Nunca faça pagamentos fora dos canais informados pela plataforma.",
  "Desconfie de preços muito abaixo do mercado e de pressão por decisão imediata.",
  "Vistorie o equipamento ou contrate laudo técnico antes de concluir a compra.",
  "Confirme documentação do bem, restrições e nota fiscal antes da transferência.",
  "Mantenha todas as tratativas registradas no chat interno do DDP AGRO.",
];

function Seguranca() {
  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Segurança"
        title="Negociação segura em cada etapa"
        description="Regras claras, moderação ativa e proteção de dados pessoais conforme a LGPD."
      />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {ITEMS.map((i) => (
            <div key={i.title} className="rounded-md border border-border bg-card p-6">
              <i.icon className="h-6 w-6 text-accent" />
              <h2 className="mt-4 font-display text-base font-semibold text-forest">{i.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{i.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-md border-l-4 border-accent bg-secondary/60 p-8">
          <h2 className="font-display text-lg font-semibold text-forest">
            Cinco cuidados essenciais
          </h2>
          <ul className="mt-4 space-y-3">
            {RULES.map((r) => (
              <li key={r} className="flex gap-3 text-sm text-muted-foreground">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PublicLayout>
  );
}
