import { supabase } from "@/integrations/supabase/client";

export interface AdminOverview {
  members: number;
  sellers: number;
  buyers: number;
  pendingMembers: number;
  pendingListings: number;
  approvedListings: number;
  proposals: number;
}

async function count(table: "profiles" | "listings" | "proposals", apply?: (q: never) => never) {
  void apply;
  const { count: total } = await supabase.from(table).select("id", { count: "exact", head: true });
  return total ?? 0;
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const [profiles, listings, proposals] = await Promise.all([
    supabase.from("profiles").select("id, role, status"),
    supabase.from("listings").select("id, status"),
    count("proposals"),
  ]);

  const p = profiles.data ?? [];
  const l = listings.data ?? [];

  return {
    members: p.length,
    sellers: p.filter((x) => x.role === "seller").length,
    buyers: p.filter((x) => x.role === "buyer").length,
    pendingMembers: p.filter((x) => x.status === "pending").length,
    pendingListings: l.filter((x) => x.status === "in_review").length,
    approvedListings: l.filter((x) => x.status === "approved").length,
    proposals,
  };
}

export async function fetchAdminMembers(status?: string) {
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role, status, city, state, person_type, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status as never);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function setMemberStatus(
  userId: string,
  status: "approved" | "rejected" | "suspended" | "pending",
  reason?: string,
) {
  const { error } = await supabase
    .from("profiles")
    .update({ status, rejection_reason: reason ?? null })
    .eq("id", userId);
  if (error) throw error;
  await supabase.from("audit_logs").insert({
    action: `member_${status}`,
    entity_type: "profile",
    entity_id: userId,
    metadata_json: reason ? { reason } : {},
  });
}

export async function fetchAdminListings(status?: string) {
  let query = supabase
    .from("listings")
    .select("id, title, slug, price, status, city, state, created_at, seller_id")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status as never);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function moderateListing(
  listingId: string,
  status: "approved" | "rejected" | "archived",
  notes?: string,
) {
  const { error } = await supabase
    .from("listings")
    .update({
      status,
      moderation_notes: notes ?? null,
      ...(status === "approved" ? { published_at: new Date().toISOString() } : {}),
    })
    .eq("id", listingId);
  if (error) throw error;
  await supabase.from("audit_logs").insert({
    action: `listing_${status}`,
    entity_type: "listing",
    entity_id: listingId,
    metadata_json: notes ? { notes } : {},
  });
}

export async function fetchAuditLogs() {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata_json, created_at, actor_id")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}
