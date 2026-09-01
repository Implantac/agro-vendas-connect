import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, Search, X } from "lucide-react";
import { z } from "zod";
import { AppPage } from "@/components/app/AppLayout";
import { ListingCard } from "@/components/catalog/ListingCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fetchApprovedListings, fetchCategories } from "@/lib/queries";
import { BRAZILIAN_STATES, CONDITION_LABELS } from "@/lib/format";

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

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", "comprar", search],
    queryFn: () =>
      fetchApprovedListings({
        search: search.q,
        category: search.categoria,
        state: search.estado,
        condition: search.condicao,
      }),
  });

  const hasFilters = Boolean(search.q || search.categoria || search.estado || search.condicao);

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Comprar máquinas</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Explore máquinas e implementos de vendedores verificados.
      </p>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
        <form
          className="relative min-w-52 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("q") as string;
            void navigate({ search: { ...search, q: value || undefined } });
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={search.q ?? ""}
            placeholder="Buscar por máquina, marca ou modelo..."
            className="pl-9"
          />
        </form>
        <Select
          value={search.categoria ?? ""}
          onValueChange={(v) =>
            void navigate({ search: { ...search, categoria: v || undefined } })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={search.condicao ?? ""}
          onValueChange={(v) => void navigate({ search: { ...search, condicao: v || undefined } })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Condição" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={search.estado ?? ""}
          onValueChange={(v) => void navigate({ search: { ...search, estado: v || undefined } })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {BRAZILIAN_STATES.map((uf) => (
              <SelectItem key={uf} value={uf}>
                {uf}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => void navigate({ search: {} })}>
            <X className="mr-1 h-4 w-4" /> Limpar
          </Button>
        )}
      </div>

      <div className="mt-6">
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
    </AppPage>
  );
}
