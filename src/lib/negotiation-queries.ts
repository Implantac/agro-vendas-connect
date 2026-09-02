import { supabase } from "@/integrations/supabase/client";

/** Negociação unificada: proposta + histórico + conversa em uma única tela. */
export async function fetchNegotiation(proposalId: string) {
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select(
      "*, listings(id,title,slug,price,city,state,condition,brand,model,manufacture_year,listing_media(url,is_cover,sort_order))",
    )
    .eq("id", proposalId)
    .maybeSingle();
  if (error) throw error;
  if (!proposal) return null;

  const [{ data: events }, { data: conversation }] = await Promise.all([
    supabase
      .from("proposal_events")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true }),
    supabase.from("conversations").select("id").eq("proposal_id", proposalId).maybeSingle(),
  ]);

  let messages: { id: string; sender_id: string; content: string; created_at: string }[] = [];
  if (conversation) {
    const { data } = await supabase
      .from("messages")
      .select("id,sender_id,content,created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    messages = data ?? [];
  }

  return {
    proposal,
    events: events ?? [],
    conversationId: conversation?.id ?? null,
    messages,
  };
}

/** Garante que exista uma conversa vinculada à proposta. */
export async function ensureConversation(proposal: {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
}) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("proposal_id", proposal.id)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      proposal_id: proposal.id,
      listing_id: proposal.listing_id,
      buyer_id: proposal.buyer_id,
      seller_id: proposal.seller_id,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function notifyCounterpart(params: {
  userId: string;
  title: string;
  message: string;
  proposalId: string;
  type: string;
}) {
  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    action_url: `/app/negociacao/${params.proposalId}`,
  });
}
