import { useCallback, useMemo } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCatalogFacetRows, type CatalogFacetRow } from "@/lib/queries";

export interface CatalogFilters {
  q?: string | undefined;
  categoria?: string | undefined;
  marcas: string[];
  preco_min?: number | undefined;
  preco_max?: number | undefined;
  ano_min?: number | undefined;
  ano_max?: number | undefined;
  condicao?: string | undefined;
  uf?: string | undefined;
  sort: string;
  page: number;
}

export type CatalogFilterPatch = Partial<Omit<CatalogFilters, "marcas">> & { marcas?: string[] };

const CATALOG_PATH = "/app/comprar";

function str(v: unknown) {
  return typeof v === "string" && v ? v : undefined;
}
function num(v: unknown) {
  const n = Number(v);
  return v === undefined || v === "" || Number.isNaN(n) ? undefined : n;
}

/**
 * Fonte única de verdade dos filtros do catálogo: a URL (search params).
 * Consumido pelo painel da Sidebar, pela busca do Header e pela página de resultados.
 */
export function useCatalogFilters() {
  const navigate = useNavigate();
  const search = useRouterState({ select: (s) => s.location.search }) as Record<string, unknown>;

  const filters: CatalogFilters = useMemo(() => {
    const marcas = str(search["marcas"]);
    return {
      q: str(search["q"]),
      categoria: str(search["categoria"]),
      marcas: marcas ? marcas.split(",").filter(Boolean) : [],
      preco_min: num(search["preco_min"]),
      preco_max: num(search["preco_max"]),
      ano_min: num(search["ano_min"]),
      ano_max: num(search["ano_max"]),
      condicao: str(search["condicao"]),
      uf: str(search["uf"]),
      sort: str(search["sort"]) ?? "relevancia",
      page: num(search["page"]) ?? 1,
    };
  }, [search]);

  const setFilters = useCallback(
    (patch: CatalogFilterPatch) => {
      const next: Record<string, unknown> = {
        q: filters.q,
        categoria: filters.categoria,
        marcas: filters.marcas.length ? filters.marcas.join(",") : undefined,
        preco_min: filters.preco_min,
        preco_max: filters.preco_max,
        ano_min: filters.ano_min,
        ano_max: filters.ano_max,
        condicao: filters.condicao,
        uf: filters.uf,
        sort: filters.sort === "relevancia" ? undefined : filters.sort,
        page: filters.page > 1 ? filters.page : undefined,
      };
      for (const [key, value] of Object.entries(patch)) {
        next[key] = key === "marcas" ? ((value as string[])?.length ? (value as string[]).join(",") : undefined) : value;
      }
      if (!("page" in patch)) next["page"] = undefined;
      for (const key of Object.keys(next)) {
        if (next[key] === undefined || next[key] === "") delete next[key];
      }
      void navigate({ to: CATALOG_PATH, search: next });
    },
    [filters, navigate],
  );

  const clearAll = useCallback(() => {
    void navigate({ to: CATALOG_PATH, search: {} });
  }, [navigate]);

  return { filters, setFilters, clearAll };
}

type FacetKey = "categoria" | "marcas" | "preco" | "ano" | "condicao" | "uf" | "q" | "none";

function matches(row: CatalogFacetRow, f: CatalogFilters, ignore: FacetKey) {
  if (ignore !== "q" && f.q) {
    const term = f.q.toLowerCase();
    const haystack = `${row.title} ${row.brand ?? ""} ${row.model ?? ""}`.toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  if (ignore !== "categoria" && f.categoria && row.categorySlug !== f.categoria) return false;
  if (ignore !== "marcas" && f.marcas.length && !(row.brand && f.marcas.includes(row.brand))) return false;
  if (ignore !== "preco") {
    const price = row.price ?? 0;
    if (f.preco_min !== undefined && price < f.preco_min) return false;
    if (f.preco_max !== undefined && price > f.preco_max) return false;
  }
  if (ignore !== "ano") {
    const year = row.manufacture_year ?? 0;
    if (f.ano_min !== undefined && year < f.ano_min) return false;
    if (f.ano_max !== undefined && year > f.ano_max) return false;
  }
  if (ignore !== "condicao" && f.condicao && row.condition !== f.condicao) return false;
  if (ignore !== "uf" && f.uf && row.state !== f.uf) return false;
  return true;
}

export interface CatalogFacets {
  categories: { slug: string; name: string; count: number }[];
  brands: { name: string; count: number }[];
  conditions: { value: string; count: number }[];
  states: { uf: string; count: number }[];
  years: number[];
  maxPrice: number;
  total: number;
  isLoading: boolean;
}

/**
 * Contagens de faceta CRUZADAS: cada faceta é calculada com todos os demais
 * filtros ativos aplicados, ignorando apenas o próprio filtro.
 */
export function useCatalogFacets(filters: CatalogFilters): CatalogFacets {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["catalog-facet-rows"],
    queryFn: fetchCatalogFacetRows,
    staleTime: 60_000,
  });

  return useMemo(() => {
    const count = <T,>(ignore: FacetKey, key: (r: CatalogFacetRow) => T | null) => {
      const map = new Map<T, number>();
      for (const row of rows) {
        if (!matches(row, filters, ignore)) continue;
        const value = key(row);
        if (value === null || value === undefined) continue;
        map.set(value, (map.get(value) ?? 0) + 1);
      }
      return map;
    };

    const catMap = count("categoria", (r) => r.categorySlug);
    const catNames = new Map(rows.map((r) => [r.categorySlug, r.categoryName]));
    const brandMap = count("marcas", (r) => r.brand);
    const condMap = count("condicao", (r) => r.condition);
    const ufMap = count("uf", (r) => r.state);

    const priceScope = rows.filter((r) => matches(r, filters, "preco"));
    const maxListingPrice = priceScope.reduce((max, r) => Math.max(max, r.price ?? 0), 0);
    const allMax = rows.reduce((max, r) => Math.max(max, r.price ?? 0), 0);
    const ceiling = Math.max(maxListingPrice, allMax, 100_000) + 50_000;

    const years = [...new Set(rows.map((r) => r.manufacture_year).filter(Boolean))] as number[];

    return {
      categories: [...catMap.entries()]
        .map(([slug, c]) => ({ slug: slug as string, name: catNames.get(slug) ?? (slug as string), count: c }))
        .sort((a, b) => b.count - a.count),
      brands: [...brandMap.entries()]
        .map(([name, c]) => ({ name: name as string, count: c }))
        .sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name))),
      conditions: [...condMap.entries()].map(([value, c]) => ({ value: value as string, count: c })),
      states: [...ufMap.entries()]
        .map(([uf, c]) => ({ uf: uf as string, count: c }))
        .sort((a, b) => a.uf.localeCompare(b.uf)),
      years: years.sort((a, b) => b - a),
      maxPrice: Math.ceil(ceiling / 25_000) * 25_000,
      total: rows.filter((r) => matches(r, filters, "none")).length,
      isLoading,
    };
  }, [rows, filters, isLoading]);
}

export function countActiveFilters(f: CatalogFilters) {
  let n = 0;
  if (f.q) n++;
  if (f.categoria) n++;
  n += f.marcas.length;
  if (f.preco_min !== undefined || f.preco_max !== undefined) n++;
  if (f.ano_min !== undefined || f.ano_max !== undefined) n++;
  if (f.condicao) n++;
  if (f.uf) n++;
  return n;
}
