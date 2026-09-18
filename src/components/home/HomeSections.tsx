import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  FileText,
  Gauge,
  History,
  MapPin,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ---------------------------------- Problema ---------------------------------- */

const PROBLEMS = [
  "Informações incompletas sobre a máquina",
  "Dificuldade para comparar oportunidades",
  "Negociação espalhada em vários canais",
  "Propostas difíceis de acompanhar",
  "Documentação sem contexto",
  "Processo de negociação desorganizado",
];

const SOLUTIONS = [
  "Ficha técnica estruturada por categoria de máquina",
  "Comparação lado a lado dentro da plataforma",
  "Proposta, contraproposta e mensagens no mesmo lugar",
  "Histórico de cada negociação registrado",
  "Documentos organizados no dossiê da máquina",
  "Etapas claras até a conclusão do pedido",
];

export function ProblemSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">O problema</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-forest">
          Comprar uma máquina agrícola exige mais do que encontrar um anúncio.
        </h2>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-7">
          <div className="flex items-center gap-2 text-sm font-semibold text-clay">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Como costuma ser
          </div>
          <ul className="mt-5 space-y-3">
            {PROBLEMS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-forest p-7 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Com o DDP AGRO
          </div>
          <p className="mt-4 font-display text-xl font-semibold">
            O DDP AGRO organiza esse processo em um único ambiente.
          </p>
          <ul className="mt-5 space-y-3">
            {SOLUTIONS.map((s) => (
              <li
                key={s}
                className="flex items-start gap-2.5 text-sm text-primary-foreground/85"
              >
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- Dossiê ----------------------------------- */

const SELLER_INFO = [
  { icon: ClipboardList, label: "Identificação", value: "Fabricante, modelo, ano e número de série" },
  { icon: Gauge, label: "Uso", value: "Horas trabalhadas e estado de conservação" },
  { icon: MapPin, label: "Localização", value: "Cidade e estado onde a máquina está" },
  { icon: History, label: "Histórico", value: "Manutenções e registros informados pelo proprietário" },
];

const VERIFIED_INFO = [
  { icon: FileText, label: "Documentos enviados", value: "CRLV, nota fiscal, laudos e manutenções" },
  { icon: BadgeCheck, label: "Conferência da equipe", value: "Cada arquivo analisado, com data e responsável" },
];

export function DossierSection() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Dossiê da máquina
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-forest">
            Muito mais do que um anúncio. Um ambiente estruturado para analisar a máquina.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Cada máquina tem um cadastro próprio, permanente, que acompanha o equipamento em todos
            os anúncios e negociações.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-7">
            <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-forest">
              Informado pelo vendedor
            </span>
            <ul className="mt-6 space-y-5">
              {SELLER_INFO.map((i) => (
                <li key={i.label} className="flex items-start gap-3">
                  <i.icon className="mt-0.5 h-5 w-5 shrink-0 text-forest" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-forest">{i.label}</p>
                    <p className="text-sm text-muted-foreground">{i.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-accent/50 bg-card p-7 ring-1 ring-accent/20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verificado pelo DDP AGRO
            </span>
            <ul className="mt-6 space-y-5">
              {VERIFIED_INFO.map((i) => (
                <li key={i.label} className="flex items-start gap-3">
                  <i.icon className="mt-0.5 h-5 w-5 shrink-0 text-forest" aria-hidden />
                  <div>
                    <p className="text-sm font-medium text-forest">{i.label}</p>
                    <p className="text-sm text-muted-foreground">{i.value}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
              O selo de documentação verificada só aparece depois que a equipe DDP AGRO confere os
              arquivos enviados. Enquanto isso, a informação continua marcada como informada pelo
              vendedor.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Audiências --------------------------------- */

const BUYER_STEPS = [
  "Encontre máquinas",
  "Filtre por características",
  "Compare oportunidades",
  "Salve favoritos",
  "Envie propostas",
  "Negocie diretamente",
  "Acompanhe seus pedidos",
];

const SELLER_STEPS = [
  "Cadastre suas máquinas",
  "Organize as informações",
  "Publique seus anúncios",
  "Receba propostas",
  "Negocie com compradores",
  "Acompanhe suas oportunidades",
  "Gerencie suas máquinas",
];

function AudienceCard({
  eyebrow,
  title,
  steps,
  cta,
  tone,
}: {
  eyebrow: string;
  title: string;
  steps: string[];
  cta: string;
  tone: "buyer" | "seller";
}) {
  return (
    <div
      className={
        tone === "seller"
          ? "rounded-xl bg-forest p-7 text-primary-foreground sm:p-9"
          : "rounded-xl border border-border bg-card p-7 sm:p-9"
      }
    >
      <p
        className={
          tone === "seller"
            ? "text-xs font-semibold uppercase tracking-[0.22em] text-accent"
            : "text-xs font-semibold uppercase tracking-[0.22em] text-accent"
        }
      >
        {eyebrow}
      </p>
      <h3
        className={
          tone === "seller"
            ? "mt-3 font-display text-2xl font-bold"
            : "mt-3 font-display text-2xl font-bold text-forest"
        }
      >
        {title}
      </h3>
      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {steps.map((s) => (
          <li
            key={s}
            className={
              tone === "seller"
                ? "flex items-center gap-2 text-sm text-primary-foreground/85"
                : "flex items-center gap-2 text-sm text-muted-foreground"
            }
          >
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
            {s}
          </li>
        ))}
      </ul>
      <Button
        asChild
        size="lg"
        className={
          tone === "seller"
            ? "mt-8 bg-accent text-accent-foreground hover:bg-accent/90"
            : "mt-8 bg-forest hover:bg-forest/90"
        }
      >
        <Link to="/cadastro">{cta}</Link>
      </Button>
    </div>
  );
}

export function AudienceSections() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <AudienceCard
          tone="buyer"
          eyebrow="Para quem compra"
          title="Encontre a máquina certa e negocie com organização."
          steps={BUYER_STEPS}
          cta="Quero encontrar uma máquina"
        />
        <AudienceCard
          tone="seller"
          eyebrow="Para quem vende"
          title="Apresente sua máquina com informação de verdade."
          steps={SELLER_STEPS}
          cta="Quero vender no DDP AGRO"
        />
      </div>
    </section>
  );
}

/* -------------------------------- Como funciona -------------------------------- */

const STEPS = [
  { n: "01", title: "Escolha seu perfil", text: "Comprador ou vendedor." },
  { n: "02", title: "Escolha seu plano", text: "Os planos disponíveis estão logo abaixo." },
  { n: "03", title: "Faça seu cadastro", text: "Crie ou complete a sua conta." },
  { n: "04", title: "Realize o pagamento", text: "A cobrança é feita pelo provedor de pagamento." },
  { n: "05", title: "Análise da membresia", text: "O DDP AGRO valida a solicitação." },
  { n: "06", title: "Acesso liberado", text: "Você entra na plataforma conforme seu perfil e plano." },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Como funciona
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-forest">
            Do cadastro ao acesso, em seis etapas.
          </h2>
        </div>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-xl border border-border bg-card p-6">
              <span className="font-display text-sm font-bold text-accent">{s.n}</span>
              <h3 className="mt-2 font-display text-lg font-semibold text-forest">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --------------------------------- Segurança ---------------------------------- */

const SECURITY = [
  { icon: UserCheck, title: "Membros aprovados", text: "Cada cadastro passa por análise antes de liberar o acesso." },
  { icon: Search, title: "Anúncios moderados", text: "Os anúncios são revisados antes de ficarem visíveis." },
  { icon: FileText, title: "Documentação organizada", text: "Documentos ficam no dossiê da máquina, com status e data." },
  { icon: History, title: "Negociação registrada", text: "Proposta, contraproposta, prazos e mensagens ficam gravados." },
  { icon: ClipboardList, title: "Auditoria interna", text: "Operações sensíveis geram registro para a administração." },
  { icon: ShieldCheck, title: "Proteção de dados", text: "Você pode solicitar acesso, correção ou exclusão dos seus dados." },
];

export function SecuritySection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Confiança</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-forest">
          Negociação com mais organização e transparência.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          O DDP AGRO aproxima as partes e organiza o processo. A decisão de negócio e a vistoria da
          máquina continuam sendo de quem compra e de quem vende.
        </p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SECURITY.map((s) => (
          <div key={s.title} className="rounded-xl border border-border bg-card p-6">
            <s.icon className="h-6 w-6 text-forest" aria-hidden />
            <h3 className="mt-4 font-display text-base font-semibold text-forest">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------ FAQ ------------------------------------- */

const FAQ = [
  {
    q: "O que é o DDP AGRO?",
    a: "Um marketplace privado de máquinas e implementos agrícolas usados, onde compradores e vendedores aprovados encontram máquinas, analisam informações, enviam propostas e negociam em um só lugar.",
  },
  {
    q: "Quem pode participar?",
    a: "Produtores, empresas e revendas que solicitam acesso, escolhem um plano e têm o cadastro analisado pela equipe DDP AGRO.",
  },
  {
    q: "O DDP AGRO vende as máquinas?",
    a: "Não. As máquinas pertencem aos vendedores. O DDP AGRO organiza o ambiente de negociação e não é proprietário dos bens anunciados.",
  },
  {
    q: "Como funciona para comprar?",
    a: "Você busca no catálogo, filtra por características, compara oportunidades, salva favoritos, envia uma proposta e acompanha a negociação até o pedido.",
  },
  {
    q: "Como funciona para vender?",
    a: "Você cadastra a máquina uma vez, organiza as informações e documentos no dossiê, publica o anúncio (que passa por moderação), recebe propostas e negocia pela plataforma.",
  },
  {
    q: "Como funciona a membresia?",
    a: "Você escolhe um plano, faz o cadastro e envia a solicitação. Depois do pagamento confirmado, a equipe analisa e libera o acesso conforme o seu perfil.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "A cobrança é gerada com um código próprio e só é considerada paga quando o provedor de pagamento confirma. Ninguém confirma o próprio pagamento na plataforma.",
  },
  {
    q: "Quando meu acesso é liberado?",
    a: "Depois da confirmação do pagamento e da análise da solicitação pela equipe. Você acompanha cada etapa na sua página de membresia.",
  },
  {
    q: "Como funciona a negociação?",
    a: "A proposta tem valor, condições e prazo de validade. O outro lado pode aceitar, recusar ou fazer uma contraproposta. Tudo fica registrado, com mensagens e histórico, até virar pedido.",
  },
  {
    q: "As máquinas são verificadas?",
    a: "As informações são fornecidas pelo vendedor. Quando documentos são enviados, a equipe DDP AGRO analisa cada arquivo e registra o resultado no dossiê da máquina.",
  },
  {
    q: 'O que significa "verificado pelo DDP AGRO"?',
    a: "Significa que a equipe conferiu o documento correspondente e registrou a data da verificação. Sem essa conferência, a informação aparece como informada pelo vendedor.",
  },
  {
    q: "Como meus dados são protegidos?",
    a: "O acesso é controlado por perfil, as operações sensíveis são registradas e você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados pela plataforma.",
  },
];

export function FaqSection() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Dúvidas</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-forest">Perguntas frequentes</h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQ.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="text-left text-base font-medium text-forest">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ---------------------------------- CTA final ---------------------------------- */

export function FinalCta() {
  return (
    <section className="bg-forest">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
          Sua próxima oportunidade no campo pode estar aqui.
        </h2>
        <p className="mt-4 text-base text-primary-foreground/80">
          Encontre máquinas. Conheça as oportunidades. Faça sua proposta. Negocie.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/catalogo">Explorar máquinas</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Link to="/cadastro">Quero ser membro</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
