import { Link } from "@tanstack/react-router";
import { BadgeCheck, FileCheck2, Handshake, ShieldCheck } from "lucide-react";
import heroImg from "@/assets/hero-landing.jpg";
import { Button } from "@/components/ui/button";

const SIGNALS = [
  { icon: BadgeCheck, label: "Membros aprovados" },
  { icon: FileCheck2, label: "Anúncios moderados" },
  { icon: Handshake, label: "Negociação estruturada" },
  { icon: ShieldCheck, label: "Informações organizadas" },
];

export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden bg-forest">
      <img
        src={heroImg}
        alt="Trator com plantadeira, colheitadeira colhendo e pulverizador trabalhando em lavoura ao entardecer"
        width={1920}
        height={1088}
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover opacity-80"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-forest/80 via-forest/45 to-forest/10"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-32">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          DDP AGRO · Marketplace privado
        </p>
        <h1 className="mt-5 max-w-4xl text-balance-tight text-3xl font-bold leading-[1.08] text-primary-foreground sm:text-5xl lg:text-6xl">
          O marketplace privado para comprar e vender máquinas agrícolas usadas.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-primary-foreground/85 sm:text-lg">
          Encontre máquinas, analise informações, faça propostas e negocie diretamente em um
          ambiente desenvolvido para o mercado agrícola.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
          <Button
            asChild
            size="lg"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <a href="#como-funciona">Como funciona</a>
          </Button>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-4">
          {SIGNALS.map((s) => (
            <li
              key={s.label}
              className="flex items-center gap-2.5 rounded-lg border border-primary-foreground/20 bg-primary-foreground/5 px-3.5 py-3"
            >
              <s.icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span className="text-sm font-medium text-primary-foreground/90">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const STRIP = [
  "Ambiente privado",
  "Membros aprovados",
  "Anúncios moderados",
  "Negociação registrada",
  "Informações estruturadas",
];

export function TrustStrip() {
  return (
    <section aria-label="Diferenciais do DDP AGRO" className="border-b border-border bg-card">
      <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6">
        {STRIP.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
