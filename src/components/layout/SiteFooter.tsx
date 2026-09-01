import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

const COLUMNS = [
  {
    title: "Plataforma",
    links: [
      { to: "/catalogo", label: "Catálogo" },
      { to: "/como-funciona", label: "Como funciona" },
      { to: "/seguranca", label: "Negociação segura" },
      { to: "/cadastro", label: "Solicitar acesso" },
    ],
  },
  {
    title: "Suporte",
    links: [
      { to: "/central-de-ajuda", label: "Central de ajuda" },
      { to: "/contato", label: "Contato" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/termos-de-uso", label: "Termos de uso" },
      { to: "/politica-de-privacidade", label: "Política de privacidade" },
      { to: "/politica-de-cookies", label: "Política de cookies" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-forest text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="space-y-4">
          <Logo tone="light" />
          <p className="max-w-xs text-sm text-primary-foreground/70">
            Plataforma fechada de negociação de implementos agrícolas. Membros aprovados, anúncios
            moderados e propostas registradas.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/60">
              {col.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-sm text-primary-foreground/85 transition-colors hover:text-accent"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-primary-foreground/15">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-primary-foreground/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} DDP AGRO. Todos os direitos reservados.</p>
          <p>O DDP AGRO intermedeia o contato entre as partes e não é proprietário dos bens anunciados.</p>
        </div>
      </div>
    </footer>
  );
}
