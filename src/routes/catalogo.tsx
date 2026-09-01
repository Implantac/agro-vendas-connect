import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/layout/PublicLayout";
import { ListingCard } from "@/components/catalog/ListingCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchApprovedListings, fetchCategories } from "@/lib/queries";

interface CatalogSearch {
  q?: string;
  categoria?: string;
  condicao?: string;
  uf?: string;
  ordem?: "recent" | "price_asc" | "price_desc";
}

export const Route = createFileRoute("/catalogo")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    categoria: typeof search["categoria"] === "string" ? search["categoria"] : undefined,
    condicao: typeof search["condicao"] === "string" ? search["condicao"] : undefined,
    uf: typeof search["uf"] === "string" ? search["uf"] : undefined,
    ordem:
      search["ordem"] === "price_asc" || search["ordem"] === "price_desc" || search["ordem"] === "recent"
        ? search["ordem"]
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Catálogo de implementos agrícolas | DDP AGRO" },
      {
        name: "description",
        content:
          "Tratores, colheitadeiras, plantadeiras e pulverizadores novos, seminovos e usados anunciados por vendedores aprovados.",
      },
      { property: "og:title", content: "Catálogo de implementos agrícolas | DDP AGRO" },
      {
        property: "og:description",
        content: "Busque implementos agrícolas por categoria, condição, estado e faixa de preço.",
      },
    ],
  }),
  component: Catalogo,
});

const UFS = ["GO", "MT", "MS", "RS", "PR", "SP", "MG", "BA", "SC", "TO"];

function Catalogo() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", search],
    queryFn: () =>
      fetchApprovedListings({
        ...(search.q ? { search: search.q } : {}),
        ...(search.categoria ? { category: search.categoria } : {}),
        ...(search.condicao ? { condition: search.condicao } : {}),
        ...(search.uf ? { state: search.uf } : {}),
        sort: search.ordem ?? "recent",
      }),
  });

  function update(patch: Partial<CatalogSearch>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Catálogo"
        title="Implementos agrícolas disponíveis"
        description="Todos os anúncios passam por moderação técnica antes de serem publicados."
      />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-6 rounded-md border border-border bg-card p-5 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-2 text-forest">
            <SlidersHorizontal className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide">Filtros</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="busca">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="busca"
                className="pl-9"
                placeholder="Marca, modelo ou título"
                defaultValue={search.q ?? ""}
                onChange={(e) => update({ q: e.target.value || undefined })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <select
              id="categoria"
              value={search.categoria ?? ""}
              onChange={(e) => update({ categoria: e.target.value || undefined })}
              className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condicao">Condição</Label>
            <select
              id="condicao"
              value={search.condicao ?? ""}
              onChange={(e) => update({ condicao: e.target.value || undefined })}
              className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
            >
              <option value="">Todas</option>
              <option value="new">Novo</option>
              <option value="semi_new">Seminovo</option>
              <option value="used">Usado</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf">Estado</Label>
            <select
              id="uf"
              value={search.uf ?? ""}
              onChange={(e) => update({ uf: e.target.value || undefined })}
              className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() =>
              void navigate({
                search: () => ({}),
              })
            }
          >
            Limpar filtros
          </Button>
        </aside>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Carregando anúncios..." : `${listings.length} anúncio(s) encontrado(s)`}
            </p>
            <select
              aria-label="Ordenar"
              value={search.ordem ?? "recent"}
              onChange={(e) => update({ ordem: e.target.value as CatalogSearch["ordem"] })}
              className="h-9 rounded-sm border border-input bg-background px-3 text-sm"
            >
              <option value="recent">Mais recentes</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
            </select>
          </div>

          {!isLoading && listings.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-12 text-center">
              <p className="font-display text-base font-semibold text-forest">
                Nenhum implemento encontrado
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Ajuste os filtros ou volte em breve: novos anúncios são aprovados diariamente.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((l, i) => (
                <ListingCard key={l.id} listing={l as never} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PublicLayout>
  );
}
