import { supabase } from "@/integrations/supabase/client";
import type { CatalogFilters } from "@/features/catalog/useCatalogFilters";

export interface SavedSearchRow {
  id: string;
  name: string;
  filters_json: Record<string, unknown>;
  alerts_enabled: boolean;
  last_notified_at: string | null;
  created_at: string;
}

/** Só os campos que definem o perfil de máquina desejado (sem ordenação/página). */
export function filtersToJson(filters: CatalogFilters) {
  const json: Record<string, unknown> = {};
  if (filters.q) json["q"] = filters.q;
  if (filters.categoria) json["categoria"] = filters.categoria;
  if (filters.marcas.length) json["marcas"] = filters.marcas;
  if (filters.preco_min !== undefined) json["preco_min"] = filters.preco_min;
  if (filters.preco_max !== undefined) json["preco_max"] = filters.preco_max;
  if (filters.ano_min !== undefined) json["ano_min"] = filters.ano_min;
  if (filters.ano_max !== undefined) json["ano_max"] = filters.ano_max;
  if (filters.condicao) json["condicao"] = filters.condicao;
  if (filters.uf) json["uf"] = filters.uf;
  return json;
}

export function jsonToSearchParams(json: Record<string, unknown>) {
  const marcas = Array.isArray(json["marcas"]) ? (json["marcas"] as string[]).join(",") : undefined;
  return {
    ...(json["q"] ? { q: String(json["q"]) } : {}),
    ...(json["categoria"] ? { categoria: String(json["categoria"]) } : {}),
    ...(marcas ? { marcas } : {}),
    ...(json["preco_min"] !== undefined ? { preco_min: Number(json["preco_min"]) } : {}),
    ...(json["preco_max"] !== undefined ? { preco_max: Number(json["preco_max"]) } : {}),
    ...(json["ano_min"] !== undefined ? { ano_min: Number(json["ano_min"]) } : {}),
    ...(json["ano_max"] !== undefined ? { ano_max: Number(json["ano_max"]) } : {}),
    ...(json["condicao"] ? { condicao: String(json["condicao"]) } : {}),
    ...(json["uf"] ? { uf: String(json["uf"]) } : {}),
  };
}

export function describeFilters(json: Record<string, unknown>) {
  const parts: string[] = [];
  if (json["q"]) parts.push(`"${String(json["q"])}"`);
  if (json["categoria"]) parts.push(String(json["categoria"]));
  if (Array.isArray(json["marcas"]) && (json["marcas"] as string[]).length)
    parts.push((json["marcas"] as string[]).join(", "));
  if (json["condicao"]) parts.push(String(json["condicao"]));
  if (json["uf"]) parts.push(String(json["uf"]));
  if (json["preco_min"] !== undefined || json["preco_max"] !== undefined)
    parts.push(
      `R$ ${Number(json["preco_min"] ?? 0).toLocaleString("pt-BR")} – ${
        json["preco_max"] !== undefined
          ? `R$ ${Number(json["preco_max"]).toLocaleString("pt-BR")}`
          : "sem limite"
      }`,
    );
  if (json["ano_min"] !== undefined || json["ano_max"] !== undefined)
    parts.push(`Ano ${json["ano_min"] ?? "—"} a ${json["ano_max"] ?? "—"}`);
  return parts.length ? parts.join(" · ") : "Todas as máquinas";
}

export async function fetchSavedSearches(userId: string) {
  const { data, error } = await supabase
    .from("saved_searches")
    .select("id,name,filters_json,alerts_enabled,last_notified_at,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SavedSearchRow[];
}

export async function createSavedSearch(
  userId: string,
  name: string,
  filters: CatalogFilters,
  alertsEnabled: boolean,
) {
  const { error } = await supabase.from("saved_searches").insert({
    user_id: userId,
    name,
    filters_json: filtersToJson(filters) as never,
    alerts_enabled: alertsEnabled,
  });
  if (error) throw error;
}

export async function toggleSavedSearchAlerts(id: string, alertsEnabled: boolean) {
  const { error } = await supabase
    .from("saved_searches")
    .update({ alerts_enabled: alertsEnabled })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSavedSearch(id: string) {
  const { error } = await supabase.from("saved_searches").delete().eq("id", id);
  if (error) throw error;
}
