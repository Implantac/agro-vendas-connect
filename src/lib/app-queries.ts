import { supabase } from "@/integrations/supabase/client";
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

export async function respondProposal(
  proposalId: string,
  action: "accepted" | "rejected" | "countered",
  actorId: string,
  counterAmount?: number,
) {
  const updates: Record<string, unknown> = { status: action };
  if (action === "countered" && counterAmount) updates.amount = counterAmount;
  const { error } = await supabase.from("proposals").update(updates).eq("id", proposalId);
  if (error) throw error;
  await supabase.from("proposal_events").insert({
    proposal_id: proposalId,
    actor_id: actorId,
    event_type: action,
    new_status: action,
    message: counterAmount ? `Contraproposta de R$ ${counterAmount}` : null,
  });
}

export async function fetchMyListings(userId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateListingStatus(listingId: string, status: "paused" | "approved" | "archived") {
  const { error } = await supabase.from("listings").update({ status }).eq("id", listingId);
  if (error) throw error;
}

export async function fetchMyFavorites(userId: string) {
  const { data, error } = await supabase
    .from("favorites")
    .select(`id, created_at, listings(${LISTING_CARD_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).filter((f) => f.listings);
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
  const { error } = await supabase.from("favorites").insert({ user_id: userId, listing_id: listingId });
  if (error) throw error;
  return true;
}

export async function fetchFavoriteIds(userId: string) {
  const { data } = await supabase.from("favorites").select("listing_id").eq("user_id", userId);
  return new Set((data ?? []).map((f) => f.listing_id));
}

export async function fetchConversations(userId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "*, listings(title,slug,price,listing_media(url,is_cover,sort_order)), messages(content,created_at,sender_id,read_at)",
    )
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
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
