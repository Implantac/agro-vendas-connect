import { supabase } from "@/integrations/supabase/client";

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

export interface CatalogFilters {
  search?: string;
  category?: string;
  condition?: string;
  state?: string;
  minPrice?: number;
  maxPrice?: number;
  brands?: string[];
  year?: number;
  yearMin?: number;
  yearMax?: number;
  sort?: "recent" | "price_asc" | "price_desc";
}

export async function fetchApprovedListings(filters: CatalogFilters = {}) {
  let query = supabase
    .from("listings")
    .select("*, categories(name,slug), listing_media(url,is_cover,sort_order)")
    .eq("status", "approved");

  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%`,
    );
  }
  if (filters.condition)
    query = query.eq("condition", filters.condition as "new" | "semi_new" | "used");
  if (filters.state) query = query.eq("state", filters.state);
  if (filters.minPrice) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
  if (filters.brands?.length) query = query.in("brand", filters.brands);
  if (filters.year) query = query.eq("manufacture_year", filters.year);
  if (filters.yearMin) query = query.gte("manufacture_year", filters.yearMin);
  if (filters.yearMax) query = query.lte("manufacture_year", filters.yearMax);


  if (filters.sort === "price_asc") query = query.order("price", { ascending: true, nullsFirst: false });
  else if (filters.sort === "price_desc")
    query = query.order("price", { ascending: false, nullsFirst: false });
  else query = query.order("published_at", { ascending: false, nullsFirst: false });

  const { data, error } = await query.limit(60);
  if (error) throw error;

  let rows = data ?? [];
  if (filters.category) {
    rows = rows.filter((r) => (r as { categories?: { slug?: string } }).categories?.slug === filters.category);
  }
  return rows;
}

export async function fetchListingBySlug(slug: string) {
  const { data, error } = await supabase
    .from("listings")
    .select(
      "*, categories(name,slug), listing_media(url,is_cover,sort_order), seller_profiles!inner(trade_name,company_description,verification_status)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
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
  title: string;
  model: string | null;
  categorySlug: string | null;
  categoryName: string | null;
}

/** Base de dados usada para calcular contagens cruzadas de facetas. */
export async function fetchCatalogFacetRows(): Promise<CatalogFacetRow[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("id,title,model,brand,manufacture_year,price,condition,state,categories(name,slug)")
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
      categorySlug: row.categories?.slug ?? null,
      categoryName: row.categories?.name ?? null,
    };
  });
}
