import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato e privacidade | DDP AGRO" },
      {
        name: "description",
        content:
          "Fale com a equipe DDP AGRO ou registre uma solicitação de privacidade prevista na LGPD.",
      },
      { property: "og:title", content: "Contato e privacidade | DDP AGRO" },
      { property: "og:description", content: "Atendimento e solicitações LGPD do DDP AGRO." },
    ],
  }),
  component: Contato,
});

function Contato() {
  const [email, setEmail] = useState("");
  const [type, setType] = useState("contact");
  const [details, setDetails] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !details) {
      toast.error("Preencha e-mail e mensagem.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("privacy_requests").insert({
      email,
      request_type: type,
      details,
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível registrar a solicitação.", { description: error.message });
      return;
    }
    setDetails("");
    toast.success("Solicitação registrada", {
      description: "Nossa equipe responde no e-mail informado.",
    });
  }

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Contato"
        title="Fale com a equipe DDP AGRO"
        description="Atendimento comercial, suporte a membros e solicitações de privacidade (LGPD)."
      />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="space-y-5 rounded-md border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com.br"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de solicitação</Label>
            <select
              id="tipo"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
            >
              <option value="contact">Dúvida ou contato comercial</option>
              <option value="access">Acesso aos meus dados (LGPD)</option>
              <option value="correction">Correção de dados (LGPD)</option>
              <option value="deletion">Eliminação de dados (LGPD)</option>
              <option value="portability">Portabilidade de dados (LGPD)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="detalhes">Mensagem</Label>
            <Textarea
              id="detalhes"
              rows={6}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Descreva sua dúvida ou solicitação"
            />
          </div>
          <Button type="submit" disabled={saving} className="bg-forest hover:bg-forest/90">
            {saving ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </form>

        <aside className="space-y-4">
          {[
            [Mail, "Atendimento", "Respondemos em até 2 dias úteis pelo e-mail informado."],
            [MessageSquare, "Suporte a membros", "Membros aprovados também podem abrir chamado pelo painel."],
            [ShieldCheck, "Privacidade", "Toda solicitação LGPD é registrada com data, tipo e status."],
          ].map(([Icon, title, text]) => {
            const Ico = Icon as typeof Mail;
            return (
              <div key={title as string} className="rounded-md border border-border bg-secondary/50 p-5">
                <Ico className="h-5 w-5 text-accent" />
                <h2 className="mt-3 font-display text-sm font-semibold text-forest">
                  {title as string}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{text as string}</p>
              </div>
            );
          })}
        </aside>
      </div>
    </PublicLayout>
  );
}
