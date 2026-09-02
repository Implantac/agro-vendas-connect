import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, SlidersHorizontal, X } from "lucide-react";
import { z } from "zod";
import { AppPage } from "@/components/app/AppLayout";
import { BuyerFilterPanel } from "@/components/app/BuyerFilterPanel";
import { ListingCard } from "@/components/catalog/ListingCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { fetchApprovedListings } from "@/lib/queries";
import { CONDITION_LABELS } from "@/lib/format";
import { countActiveFilters, useCatalogFilters } from "@/features/catalog/useCatalogFilters";
import { useState } from "react";

const searchSchema = z.object({
  q: z.string().optional(),
  categoria: z.string().optional(),
  marcas: z.string().optional(),
  preco_min: z.coerce.number().optional(),
  preco_max: z.coerce.number().optional(),
  ano_min: z.coerce.number().optional(),
  ano_max: z.coerce.number().optional(),
  condicao: z.string().optional(),
  uf: z.string().optional(),
  sort: z.string().optional(),
  page: z.coerce.number().optional(),
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

const SORT_OPTIONS = [
  { value: "relevancia", label: "Relevância" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "year_desc", label: "Ano (mais novo)" },
];

const PAGE_SIZE = 12;

function Comprar() {
  const { filters, setFilters, clearAll } = useCatalogFilters();
  const [mobileFilters, setMobileFilters] = useState(false);

  const { data: allListings = [], isLoading } = useQuery({
    queryKey: ["listings", "comprar", filters],
    queryFn: () =>
      fetchApprovedListings({
        ...(filters.q ? { search: filters.q } : {}),
        ...(filters.categoria ? { category: filters.categoria } : {}),
        ...(filters.uf ? { state: filters.uf } : {}),
        ...(filters.condicao ? { condition: filters.condicao } : {}),
        ...(filters.marcas.length ? { brands: filters.marcas } : {}),
        ...(filters.preco_min !== undefined ? { minPrice: filters.preco_min } : {}),
        ...(filters.preco_max !== undefined ? { maxPrice: filters.preco_max } : {}),
        ...(filters.ano_min !== undefined ? { yearMin: filters.ano_min } : {}),
        ...(filters.ano_max !== undefined ? { yearMax: filters.ano_max } : {}),
        ...(filters.sort === "price_asc" || filters.sort === "price_desc"
          ? { sort: filters.sort }
          : {}),
      }),
  });

  const sorted =
    filters.sort === "year_desc"
      ? [...allListings].sort(
          (a, b) => (b.manufacture_year ?? 0) - (a.manufacture_year ?? 0),
        )
      : allListings;

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), pageCount);
  const listings = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = countActiveFilters(filters);

  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (filters.q) chips.push({ key: "q", label: `Busca: ${filters.q}`, remove: () => setFilters({ q: undefined }) });
  if (filters.categoria)
    chips.push({ key: "categoria", label: filters.categoria, remove: () => setFilters({ categoria: undefined }) });
  for (const brand of filters.marcas)
    chips.push({
      key: `marca-${brand}`,
      label: brand,
      remove: () => setFilters({ marcas: filters.marcas.filter((b) => b !== brand) }),
    });
  if (filters.preco_min !== undefined || filters.preco_max !== undefined)
    chips.push({
      key: "preco",
      label: `Preço: ${filters.preco_min ? `R$ ${filters.preco_min.toLocaleString("pt-BR")}` : "R$ 0"} – ${filters.preco_max ? `R$ ${filters.preco_max.toLocaleString("pt-BR")}` : "sem limite"}`,
      remove: () => setFilters({ preco_min: undefined, preco_max: undefined }),
    });
  if (filters.ano_min !== undefined || filters.ano_max !== undefined)
    chips.push({
      key: "ano",
      label: `Ano: ${filters.ano_min ?? "—"} a ${filters.ano_max ?? "—"}`,
      remove: () => setFilters({ ano_min: undefined, ano_max: undefined }),
    });
  if (filters.condicao)
    chips.push({
      key: "condicao",
      label: CONDITION_LABELS[filters.condicao as keyof typeof CONDITION_LABELS] ?? filters.condicao,
      remove: () => setFilters({ condicao: undefined }),
    });
  if (filters.uf) chips.push({ key: "uf", label: filters.uf, remove: () => setFilters({ uf: undefined }) });

  return (
    <AppPage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Comprar máquinas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Encontre tratores, colheitadeiras e implementos para o seu negócio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <Sheet open={mobileFilters} onOpenChange={setMobileFilters}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-0">
              <SheetHeader className="border-b border-border px-5 py-4">
                <SheetTitle className="font-display text-forest">Filtros</SheetTitle>
              </SheetHeader>
              <BuyerFilterPanel showResultsButton onApplied={() => setMobileFilters(false)} />
            </SheetContent>
          </Sheet>

          <span className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${total} ${total === 1 ? "resultado" : "resultados"}`}
          </span>

          <Select value={filters.sort} onValueChange={(v) => setFilters({ sort: v })}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.remove}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-forest transition-colors hover:bg-secondary"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Limpar todos
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="mt-6 grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <PackageSearch className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-lg font-semibold text-forest">
            Nenhuma máquina encontrada com esses filtros
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente ajustar ou limpar os filtros para ver mais resultados.
          </p>
          <Button variant="outline" className="mt-4" onClick={clearAll}>
            Limpar filtros
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-6 text-xs text-muted-foreground">
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + listings.length} de {total}
          </p>
          <div className="mt-3 grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
            {listings.map((l, i) => (
              <ListingCard key={l.id} listing={l as never} index={i} />
            ))}
          </div>
          {pageCount > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setFilters({ page: page - 1 })}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount}
                onClick={() => setFilters({ page: page + 1 })}
              >
                Próxima
              </Button>
            </div>
          )}
        </>
      )}
    </AppPage>
  );
}
