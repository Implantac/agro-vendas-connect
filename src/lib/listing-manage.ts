import { supabase } from "@/integrations/supabase/client";
import { normalizeListingPhoto } from "@/lib/image-normalize";

const BUCKET = "listing-photos";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 5; // 5 anos

export interface ListingFormValues {
  categoryId: string;
  title: string;
  brand: string;
  model: string;
  year: string;
  condition: string;
  hours: string;
  description: string;
  price: string;
  priceOnRequest: boolean;
  city: string;
  state: string;
}

export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || "anuncio"}-${Math.random().toString(36).slice(2, 8)}`;
}

function toRow(values: ListingFormValues) {
  return {
    category_id: values.categoryId || null,
    title: values.title.trim(),
    brand: values.brand.trim() || null,
    model: values.model.trim() || null,
    manufacture_year: values.year ? Number(values.year) : null,
    condition: (values.condition || "used") as "new" | "semi_new" | "used",
    hours_used: values.hours ? Number(values.hours) : null,
    description: values.description.trim(),
    price: values.priceOnRequest ? null : Number(values.price) || null,
    price_on_request: values.priceOnRequest,
    city: values.city.trim() || null,
    state: values.state || null,
  };
}

/** Cria um anúncio real do vendedor (rascunho ou enviado para análise). */
export async function createListing(
  sellerId: string,
  values: ListingFormValues,
  status: "draft" | "in_review",
) {
  const { data, error } = await supabase
    .from("listings")
    .insert({
      ...toRow(values),
      seller_id: sellerId,
      slug: slugify(values.title),
      status,
    })
    .select("id, slug")
    .single();
  if (error) throw error;
  return data;
}

export async function updateListing(listingId: string, values: ListingFormValues) {
  const { error } = await supabase.from("listings").update(toRow(values)).eq("id", listingId);
  if (error) throw error;
}

export async function setListingStatus(
  listingId: string,
  status: "draft" | "in_review" | "approved" | "rejected" | "paused" | "archived",
  moderationNotes?: string | null,
) {
  const { error } = await supabase
    .from("listings")
    .update({
      status,
      ...(status === "approved" ? { published_at: new Date().toISOString() } : {}),
      ...(moderationNotes !== undefined ? { moderation_notes: moderationNotes } : {}),
    })
    .eq("id", listingId);
  if (error) throw error;
}

export async function deleteListing(listingId: string) {
  await supabase.from("listing_media").delete().eq("listing_id", listingId);
  const { error } = await supabase.from("listings").delete().eq("id", listingId);
  if (error) throw error;
}

/** Envia as fotos para o armazenamento e registra em listing_media. */
export async function uploadListingPhotos(
  userId: string,
  listingId: string,
  files: File[],
  startIndex: number,
) {
  const inserted: { url: string; is_cover: boolean; sort_order: number }[] = [];
  for (const [i, original] of files.entries()) {
    const file = await normalizeListingPhoto(original);
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const path = `${userId}/${listingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (signError || !signed) throw signError ?? new Error("Falha ao gerar URL da foto");
    inserted.push({
      url: signed.signedUrl,
      is_cover: startIndex === 0 && i === 0,
      sort_order: startIndex + i,
    });
  }
  if (!inserted.length) return;
  const { error } = await supabase
    .from("listing_media")
    .insert(inserted.map((m) => ({ ...m, listing_id: listingId, media_type: "image" })));
  if (error) throw error;
}

export async function deleteListingPhoto(mediaId: string) {
  const { error } = await supabase.from("listing_media").delete().eq("id", mediaId);
  if (error) throw error;
}

export async function setCoverPhoto(listingId: string, mediaId: string) {
  await supabase.from("listing_media").update({ is_cover: false }).eq("listing_id", listingId);
  const { error } = await supabase.from("listing_media").update({ is_cover: true }).eq("id", mediaId);
  if (error) throw error;
}

export async function fetchListingMedia(listingId: string) {
  const { data, error } = await supabase
    .from("listing_media")
    .select("id,url,is_cover,sort_order")
    .eq("listing_id", listingId)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

const SELLER_LOGO_BUCKET = "seller-logos";

/** Envia a foto/logo real do vendedor e devolve a URL para exibição pública. */
export async function uploadSellerLogo(userId: string, file: File) {
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(SELLER_LOGO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data: signed, error: signError } = await supabase.storage
    .from(SELLER_LOGO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !signed) throw signError ?? new Error("Falha ao gerar URL da foto");
  return signed.signedUrl;
}
