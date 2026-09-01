import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch, SlidersHorizontal, X } from "lucide-react";
import { z } from "zod";
import { AppPage } from "@/components/app/AppLayout";
import { CatalogFilterSidebar, type CatalogFilterValues } from "@/components/app/CatalogFilterSidebar";
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
import { fetchApprovedListings, fetchCatalogFacets } from "@/lib/queries";
import { BRAZILIAN_STATES, CONDITION_LABELS } from "@/lib/format";

const searchSchema = z.object({
  q: z.string().optional(),
  categoria: z.string().optional(),
  estado: z.string().optional(),
  condicao: z.string().optional(),
  marcas: z.string().optional(),
  precoMin: z.coerce.number().optional(),
  precoMax: z.coerce.number().optional(),
  ano: z.coerce.number().optional(),
});

type CatalogSearch = z.infer<typeof searchSchema>;

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
  const { profile } = useAuth();
  const isBuyer = profile?.role === "buyer";

  const brands = search.marcas ? search.marcas.split(",").filter(Boolean) : [];

  const { data: facets } = useQuery({ queryKey: ["catalog-facets"], queryFn: fetchCatalogFacets });
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", "comprar", search],
    queryFn: () =>
      fetchApprovedListings({
        ...(search.q ? { search: search.q } : {}),
        ...(search.categoria ? { category: search.categoria } : {}),
        ...(search.estado ? { state: search.estado } : {}),
        ...(search.condicao ? { condition: search.condicao } : {}),
        ...(brands.length ? { brands } : {}),
        ...(search.precoMin ? { minPrice: search.precoMin } : {}),
        ...(search.precoMax ? { maxPrice: search.precoMax } : {}),
        ...(search.ano ? { year: search.ano } : {}),
      }),
  });

  const hasFilters = Object.values(search).some((v) => v !== undefined && v !== "");

  const values: CatalogFilterValues = {
    categoria: search.categoria,
    marcas: brands,
    precoMin: search.precoMin,
    precoMax: search.precoMax,
    ano: search.ano,
  };

  function applyFilters(patch: Partial<CatalogFilterValues>) {
    const next: CatalogSearch = { ...search };
    if ("categoria" in patch) next.categoria = patch.categoria;
    if ("marcas" in patch) next.marcas = patch.marcas?.length ? patch.marcas.join(",") : undefined;
    if ("precoMin" in patch) next.precoMin = patch.precoMin;
    if ("precoMax" in patch) next.precoMax = patch.precoMax;
    if ("ano" in patch) next.ano = patch.ano;
    void navigate({ search: next });
  }

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (search.q) chips.push({ key: "q", label: `Busca: ${search.q}`, clear: () => void navigate({ search: { ...search, q: undefined } }) });
  if (search.categoria)
    chips.push({ key: "categoria", label: search.categoria, clear: () => applyFilters({ categoria: undefined }) });
  for (const b of brands)
    chips.push({
      key: `marca-${b}`,
      label: b,
      clear: () => applyFilters({ marcas: brands.filter((x) => x !== b) }),
    });
  if (search.precoMin || search.precoMax)
    chips.push({
      key: "preco",
      label: `Preço: ${search.precoMin ? `R$ ${search.precoMin.toLocaleString("pt-BR")}` : "R$ 0"} – ${search.precoMax ? `R$ ${search.precoMax.toLocaleString("pt-BR")}` : "sem limite"}`,
      clear: () => applyFilters({ precoMin: undefined, precoMax: undefined }),
    });
  if (search.ano) chips.push({ key: "ano", label: `A partir de ${search.ano}`, clear: () => applyFilters({ ano: undefined }) });
  if (search.condicao)
    chips.push({
      key: "condicao",
      label: CONDITION_LABELS[search.condicao as keyof typeof CONDITION_LABELS] ?? search.condicao,
      clear: () => void navigate({ search: { ...search, condicao: undefined } }),
    });
  if (search.estado)
    chips.push({
      key: "estado",
      label: search.estado,
      clear: () => void navigate({ search: { ...search, estado: undefined } }),
    });

  return (
    <AppPage>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">
            Comprar máquinas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore máquinas e implementos de vendedores verificados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="mr-2 h-4 w-4" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto p-0">
              <SheetHeader className="border-b border-border px-5 py-4">
                <SheetTitle className="font-display text-forest">Filtros</SheetTitle>
              </SheetHeader>
              <div className="p-4">
                <CatalogFilterSidebar
                  facets={facets}
                  values={values}
                  onChange={applyFilters}
                  className="border-0"
                />
              </div>
            </SheetContent>
          </Sheet>
          <Select
            value={search.condicao ?? ""}
            onValueChange={(v) => void navigate({ search: { ...search, condicao: v || undefined } })}
          >
            <SelectTrigger className="h-9 w-36">
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
            <SelectTrigger className="h-9 w-28">
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
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.clear}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-medium text-forest transition-colors hover:bg-secondary"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => void navigate({ search: {} })}>
              Limpar tudo
            </Button>
          )}
        </div>
      )}

      <p className="mb-4 mt-6 text-sm text-muted-foreground">
        {listings.length} {listings.length === 1 ? "resultado" : "resultados"}
      </p>

      {isLoading ? (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
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
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
          {listings.map((l, i) => (
            <ListingCard key={l.id} listing={l as never} index={i} />
          ))}
        </div>
      )}
    </AppPage>
  );
}
