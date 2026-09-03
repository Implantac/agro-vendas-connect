import { supabase } from "@/integrations/supabase/client";

const DEFAULT_COMMISSION_PERCENT = 4;

async function commissionPercent(): Promise<number> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "commission_percent")
    .maybeSingle();
  const value = (data?.value as { value?: number } | null)?.value;
  return typeof value === "number" ? value : DEFAULT_COMMISSION_PERCENT;
}

export async function fetchOrderByProposal(proposalId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("proposal_id", proposalId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type OrderInput = {
  proposalId: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  actorId: string;
};

/** Gera o pedido a partir da proposta aceita (idempotente). */
export async function ensureOrderForProposal(input: OrderInput) {
  const existing = await fetchOrderByProposal(input.proposalId);
  if (existing) return existing;

  const percent = await commissionPercent();
  const commission = Math.round(input.amount * percent) / 100;
  const { data, error } = await supabase
    .from("orders")
    .insert({
      proposal_id: input.proposalId,
      listing_id: input.listingId,
      buyer_id: input.buyerId,
      seller_id: input.sellerId,
      amount: input.amount,
      commission_amount: commission,
      seller_net_amount: input.amount - commission,
      status: "created",
    })
    .select("*")
    .single();
  if (error) throw error;

  await supabase.from("order_events").insert({
    order_id: data.id,
    actor_id: input.actorId,
    event_type: "order_created",
    metadata_json: { amount: input.amount, commission_percent: percent },
  });
  return data;
}

export async function updateOrderStatus(
  orderId: string,
  status: "awaiting_payment" | "in_delivery" | "completed" | "cancelled",
  actorId: string,
) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
  await supabase.from("order_events").insert({
    order_id: orderId,
    actor_id: actorId,
    event_type: `status_${status}`,
    metadata_json: {},
  });
}
