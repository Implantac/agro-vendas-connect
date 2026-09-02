import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, ShieldCheck, BadgeCheck, MessagesSquare, X } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ListingCard } from "@/components/catalog/ListingCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fetchApprovedListings, fetchCategories, fetchCatalogFacetRows } from "@/lib/queries";
import { formatCurrency } from "@/lib/format";

interface CatalogSearch {
  q?: string | undefined;
  categoria?: string | undefined;
  condicao?: string | undefined;
  uf?: string | undefined;
  marca?: string | undefined;
  preco_min?: number | undefined;
  preco_max?: number | undefined;
  ano_min?: number | undefined;
  ano_max?: number | undefined;
  ordem?: "recent" | "price_asc" | "price_desc" | undefined;
}

function str(v: unknown) {
  return typeof v === "string" && v ? v : undefined;
}
function num(v: unknown) {
  const n = Number(v);
  return v === undefined || v === "" || Number.isNaN(n) ? undefined : n;
}

export const Route = createFileRoute("/catalogo")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    q: str(search["q"]),
    categoria: str(search["categoria"]),
    condicao: str(search["condicao"]),
    uf: str(search["uf"]),
    marca: str(search["marca"]),
    preco_min: num(search["preco_min"]),
    preco_max: num(search["preco_max"]),
    ano_min: num(search["ano_min"]),
    ano_max: num(search["ano_max"]),
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
          "Tratores, colheitadeiras, plantadeiras e pulverizadores seminovos e usados anunciados por vendedores aprovados.",
      },
      { property: "og:title", content: "Catálogo de implementos agrícolas | DDP AGRO" },
      {
        property: "og:description",
        content: "Busque implementos agrícolas por categoria, marca, condição, estado, ano e faixa de preço.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Catalogo,
});

const CONDICAO_LABEL: Record<string, string> = {
  new: "Novo",
  semi_new: "Seminovo",
  used: "Usado",
};

function Catalogo() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: facetRows = [] } = useQuery({
    queryKey: ["catalog-facet-rows"],
    queryFn: fetchCatalogFacetRows,
    staleTime: 60_000,
  });

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["listings", search],
    queryFn: () =>
      fetchApprovedListings({
        ...(search.q ? { search: search.q } : {}),
        ...(search.categoria ? { category: search.categoria } : {}),
        ...(search.condicao ? { condition: search.condicao } : {}),
        ...(search.uf ? { state: search.uf } : {}),
        ...(search.marca ? { brands: [search.marca] } : {}),
        ...(search.preco_min !== undefined ? { minPrice: search.preco_min } : {}),
        ...(search.preco_max !== undefined ? { maxPrice: search.preco_max } : {}),
        ...(search.ano_min !== undefined ? { yearMin: search.ano_min } : {}),
        ...(search.ano_max !== undefined ? { yearMax: search.ano_max } : {}),
        sort: search.ordem ?? "recent",
      }),
  });

  /** Opções reais derivadas do acervo aprovado. */
  const options = useMemo(() => {
    const brands = [...new Set(facetRows.map((r) => r.brand).filter(Boolean))] as string[];
    const ufs = [...new Set(facetRows.map((r) => r.state).filter(Boolean))] as string[];
    const years = [...new Set(facetRows.map((r) => r.manufacture_year).filter(Boolean))] as number[];
    return {
      brands: brands.sort((a, b) => a.localeCompare(b)),
      ufs: ufs.sort((a, b) => a.localeCompare(b)),
      years: years.sort((a, b) => b - a),
    };
  }, [facetRows]);

  function update(patch: Partial<CatalogSearch>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  /** Busca com debounce: navegação só depois que o usuário para de digitar. */
  const [term, setTerm] = useState(search.q ?? "");
  useEffect(() => setTerm(search.q ?? ""), [search.q]);
  useEffect(() => {
    const current = search.q ?? "";
    if (term === current) return;
    const id = setTimeout(() => update({ q: term || undefined }), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const chips: { label: string; clear: Partial<CatalogSearch> }[] = [];
  if (search.q) chips.push({ label: `Busca: ${search.q}`, clear: { q: undefined } });
  if (search.categoria)
    chips.push({
      label: categories.find((c) => c.slug === search.categoria)?.name ?? search.categoria,
      clear: { categoria: undefined },
    });
  if (search.marca) chips.push({ label: search.marca, clear: { marca: undefined } });
  if (search.condicao)
    chips.push({ label: CONDICAO_LABEL[search.condicao] ?? search.condicao, clear: { condicao: undefined } });
  if (search.uf) chips.push({ label: `Estado: ${search.uf}`, clear: { uf: undefined } });
  if (search.preco_min !== undefined || search.preco_max !== undefined)
    chips.push({
      label: `Preço ${search.preco_min ? formatCurrency(search.preco_min) : "0"} – ${
        search.preco_max ? formatCurrency(search.preco_max) : "sem limite"
      }`,
      clear: { preco_min: undefined, preco_max: undefined },
    });
  if (search.ano_min !== undefined || search.ano_max !== undefined)
    chips.push({
      label: `Ano ${search.ano_min ?? "—"} a ${search.ano_max ?? "—"}`,
      clear: { ano_min: undefined, ano_max: undefined },
    });

  const selectClass = "h-10 w-full rounded-sm border border-input bg-background px-3 text-sm";

  return (
    <PublicLayout>
      {/* Barra de busca em destaque: é o ponto de entrada do catálogo público */}
      <section className="border-b border-border bg-forest">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Catálogo público</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
            Encontre o implemento certo
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-primary-foreground/75">
            Vitrine aberta a visitantes. Para enviar propostas e falar com o vendedor é preciso ser membro
            aprovado.
          </p>
          <div className="relative mt-6 max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="h-14 rounded-md pl-12 text-base"
              placeholder="Buscar por trator, colheitadeira, marca ou modelo..."
              aria-label="Buscar implementos"
            />
          </div>
        </div>
      </section>

      <div className="border-b border-border bg-secondary/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 text-xs font-medium text-forest sm:px-6">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-accent" /> Vendedores verificados
          </span>
          <span className="inline-flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-accent" /> Anúncios moderados
          </span>
          <span className="inline-flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-accent" /> Propostas e chat na plataforma
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-5 rounded-md border border-border bg-card p-5 lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-2 text-forest">
            <SlidersHorizontal className="h-4 w-4" />
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide">Filtros</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <select
              id="categoria"
              value={search.categoria ?? ""}
              onChange={(e) => update({ categoria: e.target.value || undefined })}
              className={selectClass}
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
            <Label htmlFor="marca">Marca</Label>
            <select
              id="marca"
              value={search.marca ?? ""}
              onChange={(e) => update({ marca: e.target.value || undefined })}
              className={selectClass}
            >
              <option value="">Todas</option>
              {options.brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Faixa de preço (R$)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Mínimo"
                value={search.preco_min ?? ""}
                onChange={(e) => update({ preco_min: e.target.value ? Number(e.target.value) : undefined })}
                aria-label="Preço mínimo"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Máximo"
                value={search.preco_max ?? ""}
                onChange={(e) => update({ preco_max: e.target.value ? Number(e.target.value) : undefined })}
                aria-label="Preço máximo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ano de fabricação</Label>
            <div className="flex items-center gap-2">
              <select
                value={search.ano_min ?? ""}
                onChange={(e) => update({ ano_min: e.target.value ? Number(e.target.value) : undefined })}
                className={selectClass}
                aria-label="Ano mínimo"
              >
                <option value="">De</option>
                {options.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={search.ano_max ?? ""}
                onChange={(e) => update({ ano_max: e.target.value ? Number(e.target.value) : undefined })}
                className={selectClass}
                aria-label="Ano máximo"
              >
                <option value="">Até</option>
                {options.years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condicao">Condição</Label>
            <select
              id="condicao"
              value={search.condicao ?? ""}
              onChange={(e) => update({ condicao: e.target.value || undefined })}
              className={selectClass}
            >
              <option value="">Todas</option>
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
              className={selectClass}
            >
              <option value="">Todos</option>
              {options.ufs.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>

          <Button variant="ghost" className="w-full" onClick={() => void navigate({ search: () => ({}) })}>
            Limpar filtros
          </Button>
        </aside>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
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

          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => update(chip.clear)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-forest hover:border-forest"
                >
                  {chip.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

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
