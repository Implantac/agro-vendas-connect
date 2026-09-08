import { supabase } from "@/integrations/supabase/client";
import type { CommercialTerms } from "@/lib/permissions/negotiation";

/** Registra visualização (idempotente por usuário/dia; regra no banco). */
export async function registerListingView(listingId: string) {
  await supabase.rpc("register_listing_view", { _listing_id: listingId });
}

export async function fetchPriceHistory(listingIds: string[]) {
  if (!listingIds.length) return [];
  const { data } = await supabase
    .from("listing_price_history")
    .select("listing_id,old_price,new_price,changed_at")
    .in("listing_id", listingIds)
    .order("changed_at", { ascending: false });
  return data ?? [];
}

export const COMPARE_SELECT =
  "id,title,slug,brand,model,manufacture_year,condition,hours_used,price,price_on_request,city,state,status,seller_id,technical_data_json,categories(name,slug),listing_media(url,is_cover,sort_order)";

export async function fetchListingsByIds(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase.from("listings").select(COMPARE_SELECT).in("id", ids);
  if (error) throw error;
  const order = new Map(ids.map((id, i) => [id, i]));
  return (data ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function setFavoriteList(favoriteId: string, listName: string | null) {
  const { error } = await supabase
    .from("favorites")
    .update({ list_name: listName?.trim() || null })
    .eq("id", favoriteId);
  if (error) throw error;
}

/** Perfil público resumido do vendedor para badges de confiança. */
export async function fetchSellerTrust(sellerId: string) {
  const [{ data: profile }, { data: company }] = await Promise.all([
    supabase.from("profiles").select("status,phone,full_name").eq("id", sellerId).maybeSingle(),
    supabase
      .from("seller_profiles")
      .select("trade_name,company_description,verification_status,logo_url")
      .eq("user_id", sellerId)
      .maybeSingle(),
  ]);
  return { profile, company };
}

export interface SellerFunnel {
  views: number;
  interested: number;
  contacts: number;
  proposals: number;
  negotiating: number;
  accepted: number;
  sales: number;
}

export interface SellerFunnelRow extends SellerFunnel {
  id: string;
  title: string;
  status: string;
  price: number | null;
  slug: string;
  updated_at: string;
  lastInteraction: string | null;
}

/** Funil por anúncio e agregado: visualizações → interessados → contatos → propostas → negociação → aceite → venda. */
export async function fetchSellerFunnel(sellerId: string) {
  const { data: listings, error } = await supabase
    .from("listings")
    .select(
      "id,title,slug,status,price,views_count,updated_at,favorites(id,created_at),conversations(id,created_at),proposals(id,status,created_at,updated_at),orders(id,status)",
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows: SellerFunnelRow[] = (listings ?? []).map((l) => {
    const proposals = l.proposals ?? [];
    const dates = [
      ...(l.favorites ?? []).map((f) => f.created_at),
      ...(l.conversations ?? []).map((c) => c.created_at),
      ...proposals.map((p) => p.updated_at),
    ].sort();
    return {
      id: l.id,
      title: l.title,
      slug: l.slug,
      status: l.status,
      price: l.price,
      updated_at: l.updated_at,
      views: l.views_count ?? 0,
      interested: (l.favorites ?? []).length,
      contacts: (l.conversations ?? []).length,
      proposals: proposals.length,
      negotiating: proposals.filter((p) => ["open", "countered"].includes(p.status)).length,
      accepted: proposals.filter((p) => p.status === "accepted").length,
      sales: (l.orders ?? []).filter((o) => o.status === "completed").length,
      lastInteraction: dates.at(-1) ?? null,
    };
  });

  const total = rows.reduce<SellerFunnel>(
    (acc, r) => ({
      views: acc.views + r.views,
      interested: acc.interested + r.interested,
      contacts: acc.contacts + r.contacts,
      proposals: acc.proposals + r.proposals,
      negotiating: acc.negotiating + r.negotiating,
      accepted: acc.accepted + r.accepted,
      sales: acc.sales + r.sales,
    }),
    { views: 0, interested: 0, contacts: 0, proposals: 0, negotiating: 0, accepted: 0, sales: 0 },
  );

  return { rows, total };
}

export interface SellerLead {
  id: string; // proposal id ou conversation id
  kind: "proposal" | "conversation" | "favorite";
  listingId: string;
  listingTitle: string;
  buyerId: string;
  buyerName: string;
  stage: "interessado" | "contato" | "proposta" | "negociacao" | "aceite" | "venda" | "encerrado";
  amount: number | null;
  status: string | null;
  lastAt: string;
  proposalId: string | null;
}

const STAGE_ORDER: Record<SellerLead["stage"], number> = {
  aceite: 0,
  negociacao: 1,
  proposta: 2,
  contato: 3,
  interessado: 4,
  venda: 5,
  encerrado: 6,
};

/** Leads sempre vinculados a um anúncio; um lead por comprador × anúncio, na etapa mais avançada. */
export async function fetchSellerLeadPipeline(sellerId: string) {
  const { data: listings, error } = await supabase
    .from("listings")
    .select(
      "id,title,favorites(user_id,created_at),conversations(id,buyer_id,updated_at,proposal_id),proposals(id,buyer_id,status,amount,updated_at,orders(status))",
    )
    .eq("seller_id", sellerId);
  if (error) throw error;

  const map = new Map<string, SellerLead>();
  const put = (lead: SellerLead) => {
    const key = `${lead.listingId}:${lead.buyerId}`;
    const prev = map.get(key);
    if (!prev || STAGE_ORDER[lead.stage] < STAGE_ORDER[prev.stage]) map.set(key, lead);
  };

  for (const l of listings ?? []) {
    for (const f of l.favorites ?? [])
      put({
        id: `${l.id}:${f.user_id}`,
        kind: "favorite",
        listingId: l.id,
        listingTitle: l.title,
        buyerId: f.user_id,
        buyerName: "",
        stage: "interessado",
        amount: null,
        status: null,
        lastAt: f.created_at,
        proposalId: null,
      });
    for (const c of l.conversations ?? [])
      put({
        id: c.id,
        kind: "conversation",
        listingId: l.id,
        listingTitle: l.title,
        buyerId: c.buyer_id,
        buyerName: "",
        stage: "contato",
        amount: null,
        status: null,
        lastAt: c.updated_at,
        proposalId: c.proposal_id,
      });
    for (const p of l.proposals ?? []) {
      const sold = (p.orders ?? []).some((o) => o.status === "completed");
      const stage: SellerLead["stage"] = sold
        ? "venda"
        : p.status === "accepted"
          ? "aceite"
          : p.status === "countered"
            ? "negociacao"
            : p.status === "open"
              ? "proposta"
              : "encerrado";
      put({
        id: p.id,
        kind: "proposal",
        listingId: l.id,
        listingTitle: l.title,
        buyerId: p.buyer_id,
        buyerName: "",
        stage,
        amount: Number(p.amount),
        status: p.status,
        lastAt: p.updated_at,
        proposalId: p.id,
      });
    }
  }

  const leads = [...map.values()];
  const buyerIds = [...new Set(leads.map((x) => x.buyerId))];
  if (buyerIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,full_name,city,state")
      .in("id", buyerIds);
    const names = new Map((profiles ?? []).map((p) => [p.id, p]));
    for (const lead of leads) {
      const p = names.get(lead.buyerId);
      lead.buyerName = p
        ? `${p.full_name}${p.city ? ` • ${p.city}/${p.state ?? ""}` : ""}`
        : "Comprador";
    }
  }
  return leads.sort(
    (a, b) => STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage] || b.lastAt.localeCompare(a.lastAt),
  );
}

export async function updateProposalTerms(proposalId: string, terms: CommercialTerms) {
  const { error } = await supabase.rpc("update_proposal_terms", {
    _proposal_id: proposalId,
    _terms: terms as never,
  });
  if (error) throw new Error(error.message);
}
