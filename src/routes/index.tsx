import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sprout,
  Target,
  Users,
} from "lucide-react";
import hero from "@/assets/hero-marca.jpg";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";

const SITE_URL = "https://agro-vendas-connect.lovable.app";
const COMPANY_SITE = "https://www.ddpagro.com.br";

const VALUES = [
  "Confiança",
  "Transparência",
  "Compromisso",
  "Respeito",
  "Qualidade",
  "Segurança",
  "Excelência",
  "Tecnologia a serviço do negócio",
  "Comunidade",
  "Relacionamentos de longo prazo",
];

const PILLARS = [
  {
    icon: Users,
    title: "Conectar",
    text: "Colocar as pessoas certas diante das oportunidades certas.",
  },
  {
    icon: Target,
    title: "Especializar",
    text: "Entender que máquinas agrícolas exigem informações técnicas e específicas.",
  },
  {
    icon: ShieldCheck,
    title: "Proteger",
    text: "Construir mecanismos de confiança, controle, moderação e transparência.",
  },
  {
    icon: Sprout,
    title: "Facilitar",
    text: "Reduzir a burocracia e aproximar compradores e vendedores.",
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DDP AGRO — Marketplace privado de máquinas agrícolas usadas" },
      {
        name: "description",
        content:
          "DDP AGRO conecta compradores e vendedores de máquinas e implementos agrícolas usados em um ambiente privado, especializado, confiável e transparente.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:title",
        content: "DDP AGRO — Onde máquinas agrícolas encontram novos negócios",
      },
      {
        property: "og:description",
        content:
          "Marketplace privado de máquinas e implementos agrícolas usados. Encontre, negocie e faça negócio com segurança.",
      },
      { property: "og:url", content: SITE_URL },
    ],
    links: [{ rel: "canonical", href: SITE_URL }],
  }),
  component: Index,
});

function Index() {
  return (
    <PublicLayout>
      <section className="relative isolate overflow-hidden bg-forest">
        <img
          src={hero}
          alt="Trator com plantadeira trabalhando em lavoura ao entardecer"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/90 to-forest/30" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-36">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            DDP AGRO
          </p>
          <h1 className="mt-5 max-w-3xl text-balance-tight text-4xl font-bold leading-[1.05] text-primary-foreground sm:text-6xl">
            Onde máquinas agrícolas encontram novos negócios.
          </h1>
          <p className="mt-6 max-w-xl text-base text-primary-foreground/80 sm:text-lg">
            Marketplace privado de máquinas e implementos agrícolas usados. Um ambiente
            fechado, formado por membros e construído sobre confiança.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <a href={COMPANY_SITE} target="_blank" rel="noopener noreferrer">
                <Globe className="mr-2 h-4 w-4" /> Site da DDP AGRO
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/catalogo">Explorar catálogo</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Nossa história
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold text-forest">
              Nascemos para transformar a negociação de máquinas agrícolas usadas.
            </h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              O DDP AGRO nasce de uma constatação simples: comprar ou vender uma máquina
              agrícola usada deveria ser muito mais seguro, transparente e profissional do
              que normalmente é.
            </p>
            <p>
              O mercado agrícola movimenta máquinas de alto valor — tratores, plantadeiras,
              pulverizadores, colheitadeiras e implementos que carregam anos de trabalho,
              manutenção, conhecimento e patrimônio. Apesar disso, encontrar o equipamento
              certo, avaliar uma oportunidade, identificar um vendedor confiável e conduzir
              uma negociação segura ainda pode ser uma experiência fragmentada, informal e
              pouco transparente.
            </p>
            <p>
              Foi para resolver esse problema que nasceu o DDP AGRO. Uma plataforma criada
              para aproximar quem quer vender de quem realmente quer comprar, dentro de um
              ambiente fechado, formado por membros e construído sobre confiança.
            </p>
            <p className="font-medium text-forest">
              Não queremos ser apenas mais um classificados. Queremos criar um novo padrão
              para a negociação de máquinas agrícolas usadas.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Nossa missão
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold text-forest">
              Conectar compradores e vendedores de máquinas e implementos agrícolas usados
              em um ambiente privado, especializado, confiável e transparente.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                <p.icon className="h-7 w-7 text-forest" />
                <h3 className="mt-4 font-display text-lg font-semibold text-forest">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Nossa visão
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold text-forest">
              Ser a principal referência brasileira em negociação privada de máquinas e
              implementos agrícolas usados.
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Queremos ser reconhecidos pela confiança, qualidade dos anúncios e experiência
              de negociação que oferecemos aos nossos membros.
            </p>
            <div className="mt-8 space-y-3">
              {[
                "Tornar cada negociação mais simples, segura e eficiente.",
                "Reduzir o ruído e aumentar a relevância das oportunidades.",
                "Construir uma comunidade privada de produtores, empresas e revendas.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2 rounded-2xl bg-forest p-8 text-primary-foreground sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              O nosso propósito
            </p>
            <h3 className="mt-4 font-display text-2xl font-bold sm:text-3xl">
              Tornar o mercado de máquinas agrícolas usadas mais confiável, profissional e
              acessível.
            </h3>
            <p className="mt-6 text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
              Aproximando pessoas e oportunidades que realmente podem transformar negócios.
              Uma máquina usada ainda tem muito valor. Ela pode mudar de proprietário sem
              perder sua capacidade de produzir.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Nossos valores
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold text-forest">
              O que guia a DDP AGRO
            </h2>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {VALUES.map((v) => (
              <div
                key={v}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
              >
                <div className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span className="text-sm font-medium text-forest">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Contato
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold text-forest">
              Fale com a DDP AGRO
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Estamos à disposição para esclarecer dúvidas sobre a plataforma, membresia,
              anúncios e negociações.
            </p>
            <div className="mt-8 space-y-5">
              <div className="flex items-start gap-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
                <div>
                  <p className="font-medium text-forest">Endereço</p>
                  <p className="text-sm text-muted-foreground">Rua Gavião, 105</p>
                  <p className="text-sm text-muted-foreground">Apucarana — PR</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
                <div>
                  <p className="font-medium text-forest">E-mail</p>
                  <a
                    href="mailto:etcsuporte889@gmail.com"
                    className="text-sm text-muted-foreground underline-offset-2 hover:text-forest hover:underline"
                  >
                    etcsuporte889@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
                <div>
                  <p className="font-medium text-forest">Telefone</p>
                  <a
                    href="tel:+5543998581400"
                    className="text-sm text-muted-foreground underline-offset-2 hover:text-forest hover:underline"
                  >
                    (43) 99858-1400
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-forest" />
                <div>
                  <p className="font-medium text-forest">Site institucional</p>
                  <a
                    href={COMPANY_SITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:text-forest hover:underline"
                  >
                    www.ddpagro.com.br <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-forest p-8 text-primary-foreground sm:p-12">
            <h3 className="font-display text-2xl font-bold">
              Quer fazer parte da plataforma?
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
              Solicite acesso, envie seus documentos e comece a negociar assim que a sua
              conta for aprovada pela nossa equipe.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Link to="/cadastro">Solicitar acesso</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/catalogo">Ver catálogo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
