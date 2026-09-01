import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout, PageHeader } from "@/components/layout/PublicLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/central-de-ajuda")({
  head: () => ({
    meta: [
      { title: "Central de ajuda | DDP AGRO" },
      {
        name: "description",
        content:
          "Dúvidas frequentes sobre cadastro, aprovação de membros, publicação de anúncios, propostas e pedidos no DDP AGRO.",
      },
      { property: "og:title", content: "Central de ajuda | DDP AGRO" },
      { property: "og:description", content: "Respostas rápidas para membros do DDP AGRO." },
    ],
  }),
  component: Ajuda,
});

const FAQ = [
  [
    "Quanto tempo leva a aprovação do cadastro?",
    "A análise costuma ocorrer em até 2 dias úteis após o envio completo dos documentos. Você recebe uma notificação quando o status muda.",
  ],
  [
    "Preciso pagar para anunciar?",
    "A publicação de anúncios é gratuita durante a fase de lançamento. A comissão sobre pedidos concluídos é definida pela administração e exibida no pedido.",
  ],
  [
    "Por que meu anúncio não aparece no catálogo?",
    "Todo anúncio passa por moderação. Se estiver em análise, aguarde o retorno; se foi rejeitado, o motivo aparece no seu painel de vendedor.",
  ],
  [
    "Posso negociar fora da plataforma?",
    "Não recomendamos. Negociações fora do DDP AGRO perdem o histórico auditável, o registro de propostas e a proteção da moderação.",
  ],
  [
    "Como solicito exclusão dos meus dados?",
    "Envie uma solicitação pela página de contato indicando o tipo de pedido. Toda solicitação LGPD é registrada e respondida pela equipe.",
  ],
  [
    "O DDP AGRO garante o equipamento vendido?",
    "Não. A plataforma intermedeia o contato e registra a negociação, mas a responsabilidade sobre o bem é do vendedor.",
  ],
];

function Ajuda() {
  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Central de ajuda"
        title="Perguntas frequentes"
        description="Se a sua dúvida não estiver aqui, fale com a nossa equipe."
      />
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map(([q, a], i) => (
            <AccordionItem key={q} value={`item-${i}`}>
              <AccordionTrigger className="text-left font-display text-sm font-semibold text-forest">
                {q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-10 text-sm text-muted-foreground">
          Não encontrou o que precisava?{" "}
          <Link to="/contato" className="font-medium text-forest underline">
            Fale com a equipe DDP AGRO
          </Link>
          .
        </p>
      </div>
    </PublicLayout>
  );
}
