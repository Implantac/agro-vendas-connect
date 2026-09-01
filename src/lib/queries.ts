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
