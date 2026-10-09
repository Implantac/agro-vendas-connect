import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/paginate";

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

  const [eventsRes, conversationRes, partiesRes] = await Promise.all([
    supabase
      .from("proposal_events")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true }),
    supabase.from("conversations").select("id").eq("proposal_id", proposalId).maybeSingle(),
    supabase
      .from("profiles")
      .select("id,full_name,city,state,status,phone")
      .in("id", [proposal.buyer_id, proposal.seller_id]),
  ]);
  // Erro de leitura não pode aparecer como negociação vazia.
  if (eventsRes.error) throw eventsRes.error;
  if (conversationRes.error) throw conversationRes.error;
  if (partiesRes.error) throw partiesRes.error;
  const events = eventsRes.data;
  const conversation = conversationRes.data;
  const parties = partiesRes.data;

  let messages: { id: string; sender_id: string; content: string; created_at: string }[] = [];
  if (conversation) {
    messages = await fetchAllRows(
      (from, to) =>
        supabase
          .from("messages")
          .select("id,sender_id,content,created_at")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to),
      5000,
      "Mensagens da negociação",
    );
  }

  const byId = new Map((parties ?? []).map((p) => [p.id, p]));
  return {
    proposal,
    events: events ?? [],
    conversationId: conversation?.id ?? null,
    messages,
    buyer: byId.get(proposal.buyer_id) ?? null,
    seller: byId.get(proposal.seller_id) ?? null,
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
