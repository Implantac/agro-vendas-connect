import { useEffect, useState } from "react";
import {
  Boxes,
  Cog,
  Droplets,
  Sprout,
  Tractor,
  Wheat,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SALE_CONDITION_LABELS as CONDITION_LABELS } from "@/lib/format";
import { useCatalogFacets, useCatalogFilters } from "@/features/catalog/useCatalogFilters";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tratores: Tractor,
  colheitadeiras: Wheat,
  plantadeiras: Sprout,
  pulverizadores: Droplets,
  implementos: Cog,
};

const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const PRICE_STEP = 25_000;

/**
 * Painel de filtros do comprador. Mora exclusivamente na Sidebar (ou no
 * bottom sheet mobile). Toda alteração escreve direto na URL.
 */
export function BuyerFilterPanel({
  onApplied,
  showResultsButton = false,
}: {
  onApplied?: () => void;
  showResultsButton?: boolean;
}) {
  const { filters, setFilters, clearAll } = useCatalogFilters();
  const facets = useCatalogFacets(filters);
  const [showAllBrands, setShowAllBrands] = useState(false);

  const ceiling = facets.maxPrice;
  const [range, setRange] = useState<[number, number]>([
    filters.preco_min ?? 0,
    filters.preco_max ?? ceiling,
  ]);

  useEffect(() => {
    setRange([filters.preco_min ?? 0, filters.preco_max ?? ceiling]);
  }, [filters.preco_min, filters.preco_max, ceiling]);

  if (facets.isLoading) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-secondary/70" />
        ))}
      </div>
    );
  }

  const brands = showAllBrands ? facets.brands : facets.brands.slice(0, 6);

  function toggleBrand(brand: string) {
    const next = filters.marcas.includes(brand)
      ? filters.marcas.filter((b) => b !== brand)
      : [...filters.marcas, brand];
    setFilters({ marcas: next });
  }

  return (
    <div className="pb-4">
      {/* Categorias */}
      <section className="px-5 py-4">
        <h2 className="mb-3 font-display text-sm font-bold text-forest">Categorias</h2>
        <ul className="space-y-0.5">
          {facets.categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? Boxes;
            const active = filters.categoria === c.slug;
            return (
              <li key={c.slug}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilters({ categoria: active ? undefined : c.slug })}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent/10 font-semibold text-accent"
                      : "text-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-primary")} />
                  <span className="truncate text-left">{c.name}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">{c.count}</span>
                </button>
              </li>
            );
          })}
          {facets.categories.length === 0 && (
            <li className="px-2 text-xs text-muted-foreground">Nenhuma categoria disponível.</li>
          )}
        </ul>
      </section>

      {/* Marcas */}
      <section className="border-t border-border px-5 py-4">
        <h2 className="mb-3 font-display text-sm font-bold text-forest">Marcas</h2>
        <ul className="space-y-1.5">
          {brands.map((b) => (
            <li key={b.name} className="flex items-center gap-2.5">
              <Checkbox
                id={`marca-${b.name}`}
                checked={filters.marcas.includes(b.name)}
                onCheckedChange={() => toggleBrand(b.name)}
              />
              <label
                htmlFor={`marca-${b.name}`}
                className="flex-1 cursor-pointer truncate text-sm text-foreground"
              >
                {b.name}
              </label>
              <span className="text-xs tabular-nums text-muted-foreground">{b.count}</span>
            </li>
          ))}
          {facets.brands.length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhuma marca disponível.</li>
          )}
        </ul>
        {facets.brands.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAllBrands((v) => !v)}
            className="mt-2 text-xs font-semibold text-accent hover:underline"
          >
            {showAllBrands ? "Ver menos" : `Ver mais (${facets.brands.length - 6})`}
          </button>
        )}
      </section>

      {/* Faixa de preço (De – Até) */}
      <section className="border-t border-border px-5 py-4">
        <h2 className="mb-3 font-display text-sm font-bold text-forest">Faixa de preço</h2>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{brl(range[0])}</span>
          <span>
            {brl(range[1])}
            {range[1] >= ceiling ? "+" : ""}
          </span>
        </div>
        <Slider
          value={range}
          min={0}
          max={ceiling}
          step={PRICE_STEP}
          minStepsBetweenThumbs={1}
          onValueChange={(v) => setRange([v[0] ?? 0, v[1] ?? ceiling])}
          onValueCommit={(v) =>
            setFilters({
              preco_min: (v[0] ?? 0) > 0 ? v[0] : undefined,
              preco_max: (v[1] ?? ceiling) < ceiling ? v[1] : undefined,
            })
          }
          aria-label="Faixa de preço"
        />
      </section>

      {/* Ano (De – Até) */}
      <section className="border-t border-border px-5 py-4">
        <h2 className="mb-3 font-display text-sm font-bold text-forest">Ano</h2>
        <div className="flex items-center gap-2">
          <Select
            value={filters.ano_min ? String(filters.ano_min) : "todos"}
            onValueChange={(v) => setFilters({ ano_min: v === "todos" ? undefined : Number(v) })}
          >
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder="De" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">De</SelectItem>
              {facets.years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">até</span>
          <Select
            value={filters.ano_max ? String(filters.ano_max) : "todos"}
            onValueChange={(v) => setFilters({ ano_max: v === "todos" ? undefined : Number(v) })}
          >
            <SelectTrigger className="h-9 flex-1">
              <SelectValue placeholder="Até" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Até</SelectItem>
              {facets.years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Condição */}
      <section className="border-t border-border px-5 py-4">
        <h2 className="mb-3 font-display text-sm font-bold text-forest">Condição</h2>
        <div className="flex items-center rounded-md border border-border bg-secondary/50 p-0.5">
          {(Object.keys(CONDITION_LABELS) as (keyof typeof CONDITION_LABELS)[]).map((value) => {
            const active = filters.condicao === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilters({ condicao: active ? undefined : value })}
                className={cn(
                  "flex-1 rounded px-2 py-1.5 text-xs font-semibold transition-colors",
                  active ? "bg-card text-forest shadow-sm" : "text-muted-foreground",
                )}
              >
                {CONDITION_LABELS[value]}
              </button>
            );
          })}
        </div>
      </section>

      {/* UF */}
      <section className="border-t border-border px-5 py-4">
        <h2 className="mb-3 font-display text-sm font-bold text-forest">Estado (UF)</h2>
        <Select
          value={filters.uf ?? "todos"}
          onValueChange={(v) => setFilters({ uf: v === "todos" ? undefined : v })}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {facets.states.map((s) => (
              <SelectItem key={s.uf} value={s.uf}>
                {s.uf} ({s.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* Ações */}
      <section className="border-t border-border px-5 py-4">
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-forest"
        >
          <X className="h-3.5 w-3.5" /> Limpar filtros
        </button>
        {showResultsButton && (
          <Button className="mt-3 w-full" onClick={onApplied}>
            Mostrar {facets.total} {facets.total === 1 ? "resultado" : "resultados"}
          </Button>
        )}
      </section>
    </div>
  );
}
