import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { z } from "zod";
import { AppPage } from "@/components/app/AppLayout";
import { ListingCard } from "@/components/catalog/ListingCard";
import { ListingFilters, type FilterState } from "@/components/catalog/ListingFilters";
import { fetchApprovedListings } from "@/lib/queries";

const searchSchema = z.object({
  q: z.string().optional(),
  categoria: z.string().optional(),
  estado: z.string().optional(),
  condicao: z.string().optional(),
});

export const Route = createFileRoute("/app/comprar")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Comprar máquinas | DDP AGRO" },
      { name: "description", content: "Catálogo de máquinas e implementos verificados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Comprar,
});

function Comprar() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const filters: FilterState = {
    q: search.q,
    categoria: search.categoria,
    estado: search.estado,
    condicao: search.condicao,
  };

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", "comprar", filters],
    queryFn: () =>
      fetchApprovedListings({
        q: filters.q,
        categoria: filters.categoria,
        estado: filters.estado,
        condicao: filters.condicao,
      }),
  });

  function handleFilters(next: FilterState) {
    void navigate({ search: next });
  }

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Comprar máquinas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Explore máquinas e implementos de vendedores verificados.
      </p>

      <div className="mt-7 grid gap-7 lg:grid-cols-[280px_1fr]">
        <ListingFilters value={filters} onChange={handleFilters} />
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            {listings.length} {listings.length === 1 ? "resultado" : "resultados"}
          </p>
          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-secondary/60" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
              <PackageSearch className="h-10 w-10 text-muted-foreground/50" />
              <h2 className="mt-4 font-display text-lg font-semibold text-forest">
                Nenhum resultado encontrado
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajuste os filtros ou limpe a busca para ver mais anúncios.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((l, i) => (
                <ListingCard key={l.id} listing={l as never} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}
