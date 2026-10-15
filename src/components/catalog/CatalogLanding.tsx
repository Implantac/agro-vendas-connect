import { Link } from "@tanstack/react-router";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { ListingCard, type ListingCardData } from "@/components/catalog/ListingCard";
import { Button } from "@/components/ui/button";

/** Link interno para outra página de categoria. */
export interface RelatedLink {
  slug: string;
  label: string;
}

/**
 * Página pública de listagem (categoria ou estado). Visitante vê os anúncios aprovados
 * sem login; os links internos ajudam o buscador a descobrir as demais páginas.
 */
export function CatalogLanding({
  eyebrow,
  title,
  intro,
  listings,
  catalogSearch,
  related,
  relatedTitle,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  listings: ListingCardData[];
  catalogSearch: Record<string, string>;
  related: RelatedLink[];
  relatedTitle: string;
}) {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <nav aria-label="Trilha de navegação" className="text-sm text-muted-foreground">
          <Link to="/catalogo" className="hover:underline">
            Catálogo
          </Link>
          <span className="mx-2">/</span>
          <span>{title}</span>
        </nav>

        <header className="mt-4 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-forest sm:text-4xl">{title}</h1>
          <p className="mt-3 text-muted-foreground">{intro}</p>
        </header>

        <section className="mt-10" aria-label="Anúncios">
          {listings.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
              <p className="font-medium text-forest">Nenhum anúncio aprovado aqui no momento.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Novos anúncios entram no catálogo após a verificação da equipe.
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link to="/catalogo">Ver catálogo completo</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((l, i) => (
                  <ListingCard key={l.id} listing={l} index={i} />
                ))}
              </div>
              <div className="mt-8 text-center">
                <Button asChild variant="outline">
                  <Link to="/catalogo" search={catalogSearch}>
                    Ver todos com filtros
                  </Link>
                </Button>
              </div>
            </>
          )}
        </section>

        {related.length > 0 && (
          <section className="mt-14 border-t border-border pt-8" aria-label={relatedTitle}>
            <h2 className="font-display text-xl font-semibold text-forest">{relatedTitle}</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    to="/implementos/categoria/$slug"
                    params={{ slug: r.slug }}
                    className="inline-block rounded-full border border-border bg-card px-3 py-1 text-sm text-forest hover:bg-muted"
                  >
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PublicLayout>
  );
}
