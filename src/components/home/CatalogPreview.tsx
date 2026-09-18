import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard, type ListingCardData } from "@/components/catalog/ListingCard";
import { fetchApprovedListings } from "@/lib/queries";

export function CatalogPreview() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["home", "catalog-preview"],
    queryFn: () => fetchApprovedListings({ sort: "recent" }),
  });

  const listings = (data ?? []).slice(0, 6) as unknown as ListingCardData[];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="catalogo-titulo">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Catálogo</p>
          <h2 id="catalogo-titulo" className="mt-3 font-display text-3xl font-bold text-forest">
            Encontre a máquina que você procura.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Pesquise, filtre e analise máquinas agrícolas disponíveis no marketplace.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/catalogo">Explorar catálogo</Link>
        </Button>
      </div>

      <div className="mt-10">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Não foi possível concluir esta operação.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-10 text-center">
            <p className="font-display text-lg font-semibold text-forest">
              O catálogo está sendo preparado.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Seja um dos primeiros membros do DDP AGRO.
            </p>
            <Button asChild className="mt-5 bg-forest hover:bg-forest/90">
              <Link to="/cadastro">Quero ser membro</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l, i) => (
              <ListingCard key={l.id} listing={l} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
