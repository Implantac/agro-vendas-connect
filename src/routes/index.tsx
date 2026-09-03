import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, FileCheck2, Handshake, Search, ArrowRight } from "lucide-react";
import hero from "@/assets/hero-campo.jpg";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ListingCard } from "@/components/catalog/ListingCard";
import { Button } from "@/components/ui/button";
import { fetchApprovedListings, fetchCategories, fetchPlatformStats } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DDP AGRO — Marketplace de implementos agrícolas" },
      {
        name: "description",
        content:
          "Plataforma fechada para compra e venda de tratores, colheitadeiras e implementos agrícolas com membros aprovados e anúncios moderados.",
      },
      { property: "og:title", content: "DDP AGRO — Negócios agrícolas começam com confiança" },
      {
        property: "og:description",
        content:
          "Compre e venda implementos agrícolas novos, seminovos e usados em um ambiente de negociação estruturada.",
      },
    ],
  }),
  component: Index,
});

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Membros aprovados",
    text: "Cada comprador e vendedor passa por análise documental antes de negociar na plataforma.",
  },
  {
    icon: FileCheck2,
    title: "Anúncios moderados",
    text: "Nenhum implemento entra no catálogo sem revisão técnica e conferência das informações.",
  },
  {
    icon: Handshake,
    title: "Propostas registradas",
    text: "Toda proposta, contraproposta e aceite fica documentado com histórico auditável.",
  },
];

function Index() {
  const { data: listings = [] } = useQuery({
    queryKey: ["listings", "destaque"],
    queryFn: () => fetchApprovedListings({ sort: "recent" }),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
  const { data: stats } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: fetchPlatformStats,
  });

  return (
    <PublicLayout>
      <section className="relative isolate overflow-hidden bg-forest">
        <img
          src={hero}
          alt="Trator operando em lavoura ao entardecer"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/85 to-forest/30" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Plataforma fechada de negociação
          </p>
          <h1 className="mt-5 max-w-3xl text-balance-tight text-4xl font-bold leading-[1.05] text-primary-foreground sm:text-6xl">
            Negócios agrícolas começam com confiança.
          </h1>
          <p className="mt-6 max-w-xl text-base text-primary-foreground/80 sm:text-lg">
            Compra e venda de implementos agrícolas novos, seminovos e usados entre membros
            qualificados, com catálogo técnico e propostas registradas.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/catalogo">
                <Search className="mr-2 h-4 w-4" /> Explorar catálogo
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/cadastro">Solicitar acesso</Link>
            </Button>
          </div>
          <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-6 border-t border-primary-foreground/20 pt-8 sm:grid-cols-4">
            {[
              [String(stats?.listings ?? 0), "implementos publicados"],
              [String(stats?.categories ?? 0), "linhas de equipamento"],
              [String(stats?.states ?? 0), "estados atendidos"],
              [String(stats?.verifiedSellers ?? 0), "vendedores verificados"],
            ].map(([t, s]) => (
              <div key={s}>
                <dt className="font-display text-2xl font-bold text-primary-foreground">{t}</dt>
                <dd className="text-xs text-primary-foreground/65">{s}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="border-l-2 border-accent pl-5">
              <p.icon className="h-6 w-6 text-forest" />
              <h2 className="mt-4 font-display text-lg font-semibold text-forest">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-forest">Categorias</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Navegue por linha de equipamento e encontre o implemento certo para a sua operação.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/catalogo"
                search={{ categoria: c.slug }}
                className="group flex items-center justify-between rounded-md border border-border bg-card px-4 py-4 transition-colors hover:border-forest"
              >
                <span>
                  <span className="block font-display text-sm font-semibold text-forest">
                    {c.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{c.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-accent transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-forest">Implementos em destaque</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Equipamentos publicados recentemente por vendedores verificados.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/catalogo">Ver catálogo completo</Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.slice(0, 6).map((l, i) => (
            <ListingCard key={l.id} listing={l as never} index={i} />
          ))}
        </div>
      </section>

      <section className="bg-forest">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-primary-foreground">
              Pronto para negociar com segurança?
            </h2>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/75">
              Solicite acesso, envie seus documentos e comece a negociar assim que a sua conta for
              aprovada pela nossa equipe.
            </p>
          </div>
          <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/cadastro">Solicitar acesso</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
