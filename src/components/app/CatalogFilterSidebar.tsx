import {
  Boxes,
  Cog,
  Droplets,
  Sprout,
  Tractor,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CatalogFacets } from "@/lib/queries";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tratores: Tractor,
  colheitadeiras: Wheat,
  plantadeiras: Sprout,
  pulverizadores: Droplets,
  implementos: Cog,
};

function compactBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

export interface CatalogFilterValues {
  categoria?: string | undefined;
  marcas: string[];
  precoMin?: number | undefined;
  precoMax?: number | undefined;
  ano?: number | undefined;
}

interface Props {
  facets: CatalogFacets | undefined;
  values: CatalogFilterValues;
  onChange: (patch: Partial<CatalogFilterValues>) => void;
  className?: string;
}

export function CatalogFilterSidebar({ facets, values, onChange, className }: Props) {
  const ceiling = facets?.maxPrice ?? 3_000_000;
  const [range, setRange] = useState<[number, number]>([
    values.precoMin ?? 0,
    values.precoMax ?? ceiling,
  ]);

  useEffect(() => {
    setRange([values.precoMin ?? 0, values.precoMax ?? ceiling]);
  }, [values.precoMin, values.precoMax, ceiling]);

  if (!facets) {
    return (
      <div className={cn("space-y-3 rounded-xl border border-border bg-card p-5", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-secondary/70" />
        ))}
      </div>
    );
  }

  const toggleBrand = (brand: string) => {
    const next = values.marcas.includes(brand)
      ? values.marcas.filter((b) => b !== brand)
      : [...values.marcas, brand];
    onChange({ marcas: next });
  };

  return (
    <aside className={cn("rounded-xl border border-border bg-card", className)}>
      {/* Categoria */}
      <section className="border-b border-border p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-forest">Categoria</h2>
        <ul className="space-y-0.5">
          {facets.categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.slug] ?? Boxes;
            const active = values.categoria === c.slug;
            return (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => onChange({ categoria: active ? undefined : c.slug })}
                  aria-pressed={active}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent/10 font-semibold text-accent"
                      : "text-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-primary")} />
                  <span className="truncate text-left">{c.name}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {c.count.toLocaleString("pt-BR")}
                  </span>
                </button>
              </li>
            );
          })}
          {facets.categories.length === 0 && (
            <li className="px-2 text-xs text-muted-foreground">Nenhuma categoria disponível.</li>
          )}
        </ul>
      </section>

      {/* Marca */}
      <section className="border-b border-border p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-forest">Marca</h2>
        <ul className="space-y-1.5">
          {facets.brands.map((b) => {
            const id = `marca-${b.name}`;
            return (
              <li key={b.name} className="flex items-center gap-2.5">
                <Checkbox
                  id={id}
                  checked={values.marcas.includes(b.name)}
                  onCheckedChange={() => toggleBrand(b.name)}
                />
                <label htmlFor={id} className="flex-1 cursor-pointer truncate text-sm text-foreground">
                  {b.name}
                </label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {b.count.toLocaleString("pt-BR")}
                </span>
              </li>
            );
          })}
          {facets.brands.length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhuma marca disponível.</li>
          )}
        </ul>
      </section>

      {/* Faixa de preço */}
      <section className="border-b border-border p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-forest">Faixa de preço</h2>
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{compactBRL(range[0])}</span>
          <span>
            {compactBRL(range[1])}
            {range[1] >= ceiling ? "+" : ""}
          </span>
        </div>
        <Slider
          value={range}
          min={0}
          max={ceiling}
          step={10000}
          onValueChange={(v) => setRange([v[0] ?? 0, v[1] ?? ceiling])}
          onValueCommit={(v) =>
            onChange({
              precoMin: (v[0] ?? 0) > 0 ? v[0] : undefined,
              precoMax: (v[1] ?? ceiling) < ceiling ? v[1] : undefined,
            })
          }
          aria-label="Faixa de preço"
        />
      </section>

      {/* Ano */}
      <section className="p-5">
        <h2 className="mb-3 font-display text-sm font-bold text-forest">Ano</h2>
        <Select
          value={values.ano ? String(values.ano) : "todos"}
          onValueChange={(v) => onChange({ ano: v === "todos" ? undefined : Number(v) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {facets.years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>
    </aside>
  );
}
