import { supabase } from "@/integrations/supabase/client";
import { sanitizeSearchTerm } from "@/lib/search-term";

export interface ListingRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  brand: string | null;
  model: string | null;
  manufacture_year: number | null;
  condition: "new" | "semi_new" | "used";
  hours_used: number | null;
  price: number | null;
  price_on_request: boolean;
  city: string | null;
  state: string | null;
  technical_data_json: Record<string, string>;
  status: string;
  seller_id: string;
  category_id: string | null;
  published_at: string | null;
  created_at: string;
}

export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,description,icon,sort_order")
    .eq("active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export interface PlatformStats {
  listings: number;
  categories: number;
  states: number;
  verifiedSellers: number;
}

/** Números reais da plataforma, usados na vitrine pública. */
export async function fetchPlatformStats(): Promise<PlatformStats> {
  const [listings, categories, sellers, regions] = await Promise.all([
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("active", true),
    supabase
      .from("seller_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "approved"),
    supabase.from("listings").select("state").eq("status", "approved").not("state", "is", null),
  ]);

  return {
    listings: listings.count ?? 0,
    categories: categories.count ?? 0,
    states: new Set((regions.data ?? []).map((r) => r.state)).size,
    verifiedSellers: sellers.count ?? 0,
  };
}

export interface CatalogFilters {
  search?: string;
  category?: string;
  condition?: string;
  state?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  year?: number;
  yearMin?: number;
  yearMax?: number;
  hoursMax?: number;
  sort?: "recent" | "price_asc" | "price_desc";
}

/** Campos realmente usados pelos cards do catálogo — evita trazer a linha inteira. */
export const CATALOG_LIST_SELECT =
  "id,title,slug,brand,model,manufacture_year,condition,hours_used,price,price_on_request,city,state,status,views_count,published_at,seller_id,technical_data_json,categories(name,slug),listing_media(url,is_cover,sort_order)";

/** Teto de linhas do catálogo público. Acima disso, a interface informa que a lista foi limitada. */
export const MAX_CATALOG_ROWS = 500;
const CATALOG_PAGE_SIZE = 100;

/** Converte o slug da categoria em id. Retorna null quando a categoria não existe. */
async function resolveCategoryId(slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

function catalogBaseQuery() {
  return supabase.from("listings").select(CATALOG_LIST_SELECT).eq("status", "approved");
}
type CatalogQuery = ReturnType<typeof catalogBaseQuery>;

/** Aplica os filtros do catálogo (sem await: o builder é encadeado de forma síncrona). */
function applyCatalogFilters(
  query: CatalogQuery,
  filters: CatalogFilters,
  categoryId: string | null,
): CatalogQuery {
  let q = query;
  if (categoryId) q = q.eq("category_id", categoryId);

  const term = sanitizeSearchTerm(filters.search ?? "");
  if (term) {
    q = q.or(`title.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%`);
  }
  if (filters.condition) q = q.eq("condition", filters.condition as "new" | "semi_new" | "used");
  if (filters.state) q = q.eq("state", filters.state);
  if (filters.city) q = q.eq("city", filters.city);
  if (filters.hoursMax !== undefined) q = q.lte("hours_used", filters.hoursMax);
  if (filters.minPrice) q = q.gte("price", filters.minPrice);
  if (filters.maxPrice) q = q.lte("price", filters.maxPrice);
  if (filters.brands?.length) q = q.in("brand", filters.brands);
  if (filters.year) q = q.eq("manufacture_year", filters.year);
  if (filters.yearMin) q = q.gte("manufacture_year", filters.yearMin);
  if (filters.yearMax) q = q.lte("manufacture_year", filters.yearMax);

  // Desempate por id: sem ele, a paginação pode repetir ou pular anúncios.
  if (filters.sort === "price_asc") q = q.order("price", { ascending: true, nullsFirst: false });
  else if (filters.sort === "price_desc")
    q = q.order("price", { ascending: false, nullsFirst: false });
  else q = q.order("published_at", { ascending: false, nullsFirst: false });

  return q.order("id", { ascending: true });
}

/** Resolve a categoria pedida. `undefined` = sem filtro; `null` = categoria inexistente. */
async function resolveFilterCategory(filters: CatalogFilters): Promise<string | null | undefined> {
  if (!filters.category) return undefined;
  return resolveCategoryId(filters.category);
}

/** Primeira página do catálogo (usada em vitrines com poucos itens). */
export async function fetchApprovedListings(filters: CatalogFilters = {}) {
  const categoryId = await resolveFilterCategory(filters);
  if (categoryId === null) return [];
  const { data, error } = await applyCatalogFilters(
    catalogBaseQuery(),
    filters,
    categoryId ?? null,
  ).limit(60);
  if (error) throw error;
  return data ?? [];
}

/**
 * Busca o catálogo completo em páginas, até `maxRows`. Retorna `truncated = true` quando
 * o teto foi atingido, para que a interface avise o visitante.
 */
export async function fetchAllApprovedListings(
  filters: CatalogFilters = {},
  maxRows: number = MAX_CATALOG_ROWS,
): Promise<{ rows: Awaited<ReturnType<typeof fetchApprovedListings>>; truncated: boolean }> {
  const rows: Awaited<ReturnType<typeof fetchApprovedListings>> = [];
  const categoryId = await resolveFilterCategory(filters);
  if (categoryId === null) return { rows, truncated: false };
  for (let from = 0; from < maxRows; from += CATALOG_PAGE_SIZE) {
    const to = Math.min(from + CATALOG_PAGE_SIZE, maxRows) - 1;
    const { data, error } = await applyCatalogFilters(
      catalogBaseQuery(),
      filters,
      categoryId ?? null,
    ).range(from, to);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < to - from + 1) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export async function fetchListingBySlug(slug: string) {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "*, categories(name,slug), listing_media(url,is_cover,sort_order), machines(id,verification_status)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  // seller_profiles não tem FK direta com listings; buscamos pelo vendedor.
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("trade_name,company_description,verification_status,logo_url")
    .eq("user_id", data.seller_id)
    .maybeSingle();

  return { ...data, seller_profiles: seller ?? null };
}

export async function fetchLegalDocument(docType: string) {
  const { data, error } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("doc_type", docType)
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface CatalogFacetRow {
  id: string;
  brand: string | null;
  manufacture_year: number | null;
  price: number | null;
  condition: "new" | "semi_new" | "used";
  state: string | null;
  city: string | null;
  hours_used: number | null;
  title: string;
  model: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  specs: Record<string, string>;
}

/** Base de dados usada para calcular contagens cruzadas de facetas. */
export async function fetchCatalogFacetRows(): Promise<CatalogFacetRow[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id,title,model,brand,manufacture_year,price,condition,state,city,hours_used,technical_data_json,categories(name,slug)",
    )
    .eq("status", "approved");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as typeof r & { categories: { name: string; slug: string } | null };
    return {
      id: row.id,
      title: row.title,
      model: row.model,
      brand: row.brand,
      manufacture_year: row.manufacture_year,
      price: row.price,
      condition: row.condition,
      state: row.state,
      city: row.city,
      hours_used: row.hours_used,
      categorySlug: row.categories?.slug ?? null,
      categoryName: row.categories?.name ?? null,
      specs: Object.fromEntries(
        Object.entries((row.technical_data_json ?? {}) as Record<string, unknown>).map(([k, v]) => [
          k,
          String(v ?? ""),
        ]),
      ),
    };
  });
}
