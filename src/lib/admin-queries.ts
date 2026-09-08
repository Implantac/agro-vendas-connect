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

/** Admin: define o papel do membro (comprador, vendedor ou administrador). */
export async function setMemberRole(userId: string, role: "buyer" | "seller" | "admin") {
  const { error } = await supabase.rpc("admin_set_member_role", {
    _user_id: userId,
    _role: role,
  });
  if (error) throw error;
}

export interface AdminConsole {
  alerts: {
    pendingMembers: number;
    listingsInReview: number;
    openReports: number;
    membershipRequests: number;
    ordersAwaitingPayment: number;
  };
  trust: {
    approvedMembers: number;
    totalMembers: number;
    verifiedSellers: number;
    totalSellers: number;
    approvedListings: number;
    totalListings: number;
    documentsPending: number;
  };
  negotiations: {
    id: string;
    amount: number;
    status: string;
    updated_at: string;
    title: string | null;
  }[];
  pipeline: { open: number; countered: number; accepted: number; closed: number };
  gmv: number;
  /** Saúde do marketplace nos últimos 30 dias — sinais acionáveis, não decorativos. */
  health: {
    views30d: number;
    interested30d: number;
    proposals30d: number;
    accepted30d: number;
    /** Propostas abertas que venceram sem resposta (vendedor lento). */
    expiredNoReply: number;
    /** Anúncios aprovados sem nenhuma visualização nos últimos 30 dias. */
    staleListings: number;
    /** Anúncios aprovados sem foto. */
    listingsWithoutPhoto: number;
  };
}

/** Painel consolidado do admin: alertas, confiança e negociações em uma única leitura. */
export async function fetchAdminConsole(): Promise<AdminConsole> {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [profiles, listings, reports, requests, orders, sellers, docs, proposals, allProposals, events, media] =
    await Promise.all([
      supabase.from("profiles").select("id, role, status"),
      supabase.from("listings").select("id, status"),
      supabase.from("reports").select("id, status"),
      supabase.from("membership_requests").select("id, status"),
      supabase.from("orders").select("id, status, amount"),
      supabase.from("seller_profiles").select("id, verification_status"),
      supabase.from("member_documents").select("id, status"),
      supabase
        .from("proposals")
        .select("id, amount, status, updated_at, listings(title)")
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase.from("proposals").select("id, status, expires_at, created_at, updated_at"),
      supabase
        .from("listing_events")
        .select("listing_id, event_type")
        .gte("created_at", since),
      supabase.from("listing_media").select("listing_id"),
    ]);

  const p = profiles.data ?? [];
  const l = listings.data ?? [];
  const o = orders.data ?? [];
  const pr = proposals.data ?? [];
  const ap = allProposals.data ?? [];
  const ev = events.data ?? [];
  const withPhoto = new Set((media.data ?? []).map((m) => m.listing_id));
  const viewed = new Set(ev.filter((e) => e.event_type === "view").map((e) => e.listing_id));
  const approvedListings = l.filter((x) => x.status === "approved");
  const now = Date.now();

  return {
    alerts: {
      pendingMembers: p.filter((x) => x.status === "pending").length,
      listingsInReview: l.filter((x) => x.status === "in_review").length,
      openReports: (reports.data ?? []).filter(
        (x) => x.status !== "resolved" && x.status !== "rejected",
      ).length,
      membershipRequests: (requests.data ?? []).filter((x) =>
        ["payment_pending", "in_review"].includes(x.status),
      ).length,
      ordersAwaitingPayment: o.filter((x) => ["created", "awaiting_payment"].includes(x.status))
        .length,
    },
    trust: {
      approvedMembers: p.filter((x) => x.status === "approved").length,
      totalMembers: p.length,
      verifiedSellers: (sellers.data ?? []).filter((x) => x.verification_status === "approved")
        .length,
      totalSellers: (sellers.data ?? []).length,
      approvedListings: approvedListings.length,
      totalListings: l.length,
      documentsPending: (docs.data ?? []).filter((x) => x.status === "pending").length,
    },
    negotiations: pr.map((x) => ({
      id: x.id,
      amount: Number(x.amount),
      status: x.status,
      updated_at: x.updated_at,
      title: (x.listings as { title: string } | null)?.title ?? null,
    })),
    pipeline: {
      open: ap.filter((x) => x.status === "open").length,
      countered: ap.filter((x) => x.status === "countered").length,
      accepted: ap.filter((x) => x.status === "accepted").length,
      closed: o.filter((x) => x.status === "completed").length,
    },
    gmv: o
      .filter((x) => ["paid", "in_delivery", "completed"].includes(x.status))
      .reduce((s, x) => s + Number(x.amount), 0),
    health: {
      views30d: ev.filter((e) => e.event_type === "view").length,
      interested30d: ev.filter((e) => e.event_type === "favorite").length,
      proposals30d: ap.filter((x) => x.created_at >= since).length,
      accepted30d: ap.filter((x) => x.status === "accepted" && x.updated_at >= since).length,
      expiredNoReply: ap.filter(
        (x) =>
          x.status === "expired" ||
          (["open", "countered"].includes(x.status) &&
            x.expires_at &&
            new Date(x.expires_at).getTime() < now),
      ).length,
      staleListings: approvedListings.filter((x) => !viewed.has(x.id)).length,
      listingsWithoutPhoto: approvedListings.filter((x) => !withPhoto.has(x.id)).length,
    },
  };
}
