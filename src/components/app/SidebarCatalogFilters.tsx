import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CatalogFilterSidebar, type CatalogFilterValues } from "./CatalogFilterSidebar";
import { fetchCatalogFacets } from "@/lib/queries";

/**
 * Filtros do catálogo exibidos na barra lateral do app para compradores.
 * Sincroniza com a rota /app/comprar via search params.
 */
export function SidebarCatalogFilters({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useRouterState({ select: (s) => s.location });
  const search = location.search as Record<string, unknown>;

  const { data: facets } = useQuery({ queryKey: ["catalog-facets"], queryFn: fetchCatalogFacets });

  const marcasParam = typeof search["marcas"] === "string" ? search["marcas"] : "";
  const num = (v: unknown) => (v === undefined || v === "" ? undefined : Number(v));

  const values: CatalogFilterValues = {
    categoria: typeof search["categoria"] === "string" ? search["categoria"] : undefined,
    marcas: marcasParam ? marcasParam.split(",").filter(Boolean) : [],
    precoMin: num(search["precoMin"]),
    precoMax: num(search["precoMax"]),
    ano: num(search["ano"]),
  };

  function applyFilters(patch: Partial<CatalogFilterValues>) {
    const base = location.pathname.startsWith("/app/comprar")
      ? { ...search }
      : ({} as Record<string, unknown>);
    if ("categoria" in patch) base["categoria"] = patch.categoria;
    if ("marcas" in patch) base["marcas"] = patch.marcas?.length ? patch.marcas.join(",") : undefined;
    if ("precoMin" in patch) base["precoMin"] = patch.precoMin;
    if ("precoMax" in patch) base["precoMax"] = patch.precoMax;
    if ("ano" in patch) base["ano"] = patch.ano;
    for (const k of Object.keys(base)) if (base[k] === undefined) delete base[k];
    void navigate({ to: "/app/comprar", search: base });
    onNavigate?.();
  }

  return (
    <CatalogFilterSidebar
      facets={facets}
      values={values}
      onChange={applyFilters}
      className="rounded-none border-0 border-t"
    />
  );
}
