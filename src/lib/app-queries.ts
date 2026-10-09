import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/paginate";
import type { Tables } from "@/integrations/supabase/types";

export type ProposalRow = Tables<"proposals">;
export type NotificationRow = Tables<"notifications">;
export type ConversationRow = Tables<"conversations">;
export type MessageRow = Tables<"messages">;

const LISTING_CARD_SELECT =
  "id,title,slug,brand,model,manufacture_year,condition,hours_used,price,price_on_request,city,state,status,views_count,categories(name,slug),listing_media(url,is_cover,sort_order)";

export async function fetchDashboardCounts(userId: string) {
  const [negotiations, proposalsReceived, proposalsWaiting, myListings, favorites] =
    await Promise.all([
      supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .in("status", ["open", "countered"]),
      supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", userId),
      supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", userId)
        .eq("status", "open"),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", userId)
        .eq("status", "approved"),
      supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
  return {
    negotiations: negotiations.count ?? 0,
    proposalsReceived: proposalsReceived.count ?? 0,
    proposalsWaiting: proposalsWaiting.count ?? 0,
    activeListings: myListings.count ?? 0,
    favorites: favorites.count ?? 0,
  };
}

export async function fetchMyProposals(userId: string) {
  const { data, error } = await supabase
    .from("proposals")
    .select("*, listings(title,slug,price,city,state,listing_media(url,is_cover,sort_order))")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

/**
 * Responde a uma proposta de forma transacional no backend:
 * o servidor valida participante, estado atual e valor, e grava
 * histórico + auditoria na mesma operação.
 */
export async function respondProposal(
  proposalId: string,
  action: "accepted" | "rejected" | "countered" | "cancelled",
  _actorId: string,
  counterAmount?: number,
) {
  const { error } = await supabase.rpc("respond_proposal", {
    _proposal_id: proposalId,
    _action: action,
    ...(counterAmount ? { _amount: counterAmount } : {}),
  });
  if (error) throw new Error(error.message);
}

/** Vendedor: interessados (favoritos + conversas) nos seus anúncios. */
export async function fetchSellerLeads(userId: string) {
  const listings = await fetchAllRows(
    (from, to) =>
      supabase
        .from("listings")
        .select(
          "id,title,slug,price,status,views_count,favorites(id,created_at,user_id),proposals(id,status,amount,created_at),conversations(id,created_at,buyer_id)",
        )
        .eq("seller_id", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    1000,
    "Leads do vendedor",
  );
  return listings.map((l) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    status: l.status,
    views: l.views_count ?? 0,
    favorites: (l.favorites ?? []).length,
    conversations: (l.conversations ?? []).length,
    proposals: (l.proposals ?? []).length,
    openProposals: (l.proposals ?? []).filter((p) => ["open", "countered"].includes(p.status))
      .length,
    negotiatingValue: (l.proposals ?? [])
      .filter((p) => ["open", "countered"].includes(p.status))
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
  }));
}

/** Pedidos do usuário (como comprador ou vendedor). */
export async function fetchMyOrders(userId: string) {
  return fetchAllRows(
    (from, to) =>
      supabase
        .from("orders")
        .select("*, listings(title,slug)")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    2000,
    "Pedidos",
  );
}

export async function fetchMyListings(userId: string) {
  return fetchAllRows(
    (from, to) =>
      supabase
        .from("listings")
        .select(LISTING_CARD_SELECT)
        .eq("seller_id", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    2000,
    "Meus anúncios",
  );
}

export async function updateListingStatus(
  listingId: string,
  status: "paused" | "approved" | "archived",
) {
  const { error } = await supabase.from("listings").update({ status }).eq("id", listingId);
  if (error) throw error;
}

export async function fetchMyFavorites(userId: string) {
  const rows = await fetchAllRows(
    (from, to) =>
      supabase
        .from("favorites")
        .select(`id, created_at, listings(${LISTING_CARD_SELECT})`)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    2000,
    "Favoritos",
  );
  return rows.filter((f) => f.listings);
}

export async function toggleFavorite(userId: string, listingId: string, isFavorite: boolean) {
  if (isFavorite) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", listingId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase
    .from("favorites")
    .insert({ user_id: userId, listing_id: listingId });
  if (error) throw error;
  return true;
}

export async function fetchFavoriteIds(userId: string) {
  const rows = await fetchAllRows(
    (from, to) =>
      supabase
        .from("favorites")
        .select("id, listing_id")
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .range(from, to),
    5000,
    "Favoritos (ids)",
  );
  return new Set(rows.map((f) => f.listing_id));
}

export async function fetchConversations(userId: string) {
  const conversations = await fetchAllRows(
    (from, to) =>
      supabase
        .from("conversations")
        .select(
          "*, listings(title,slug,price,listing_media(url,is_cover,sort_order)), proposals(status,amount)",
        )
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    1000,
    "Conversas",
  );
  if (conversations.length === 0) return [];
  // Última mensagem de cada conversa, em uma consulta (RPC conversation_last_messages).
  const { data: last, error } = await supabase.rpc("conversation_last_messages", {
    _conversation_ids: conversations.map((c) => c.id),
  });
  if (error) throw error;
  const byId = new Map((last ?? []).map((m) => [m.conversation_id, m]));
  return conversations.map((c) => ({
    ...c,
    lastMessage: byId.get(c.id) ?? null,
  }));
}

/** Quando cada conversa foi lida pelo usuário atual (conversation_id -> read_at). */
export async function fetchConversationReads(userId: string) {
  const rows = await fetchAllRows(
    (from, to) =>
      supabase
        .from("conversation_reads")
        .select("conversation_id, read_at")
        .eq("user_id", userId)
        .order("conversation_id", { ascending: true })
        .range(from, to),
    5000,
    "Leituras de conversas",
  );
  return new Map(rows.map((r) => [r.conversation_id, r.read_at]));
}

/** Marca a conversa como lida pelo usuário atual (RPC mark_conversation_read). */
export async function markConversationRead(conversationId: string) {
  const { error } = await supabase.rpc("mark_conversation_read", {
    _conversation_id: conversationId,
  });
  if (error) throw error;
}

export async function fetchMessages(conversationId: string) {
  return fetchAllRows(
    (from, to) =>
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    5000,
    "Mensagens",
  );
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, content });
  if (error) throw error;
}

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return data ?? [];
}

export async function fetchUnreadNotificationsCount(userId: string) {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function markAllNotificationsRead(userId: string) {
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
}

/* ------------------------------------------------------- painéis por papel */

/** Números reais do painel do comprador (nenhum valor estimado). */
export async function fetchBuyerSummary(userId: string) {
  const [myTurn, negotiating, orders, favorites, savedSearches, alerts] = await Promise.all([
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", userId)
      .eq("status", "countered"),
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("buyer_id", userId)
      .in("status", ["open", "countered"]),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_id", userId),
    supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("saved_searches")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);
  return {
    awaitingMyAnswer: myTurn.count ?? 0,
    negotiating: negotiating.count ?? 0,
    orders: orders.count ?? 0,
    favorites: favorites.count ?? 0,
    savedSearches: savedSearches.count ?? 0,
    alerts: alerts.count ?? 0,
  };
}

/** Números reais do painel do vendedor. */
export async function fetchSellerSummary(userId: string) {
  const [machines, approved, inReview, drafts, proposalsOpen, orders, pendingDocs] =
    await Promise.all([
      supabase.from("machines").select("id", { count: "exact", head: true }).eq("owner_id", userId),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", userId)
        .eq("status", "approved"),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", userId)
        .eq("status", "in_review"),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", userId)
        .eq("status", "draft"),
      supabase
        .from("proposals")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", userId)
        .eq("status", "open"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("seller_id", userId),
      supabase
        .from("machines")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId)
        .in("verification_status", ["unverified", "pending", "rejected"]),
    ]);
  return {
    machines: machines.count ?? 0,
    approvedListings: approved.count ?? 0,
    inReviewListings: inReview.count ?? 0,
    draftListings: drafts.count ?? 0,
    proposalsAwaiting: proposalsOpen.count ?? 0,
    orders: orders.count ?? 0,
    machinesWithPendingDocs: pendingDocs.count ?? 0,
  };
}
