import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type MembershipPlan = Tables<"membership_plans">;
export type MembershipRequest = Tables<"membership_requests">;

export type MembershipRequestWithPlan = MembershipRequest & {
  membership_plans: Pick<MembershipPlan, "id" | "name" | "code" | "price" | "period"> | null;
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  payment_pending: "Aguardando pagamento",
  in_review: "Em análise",
  approved: "Aprovada",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Estornado",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  card: "Cartão de crédito",
};

export function planBenefits(plan: Pick<MembershipPlan, "benefits_json">): string[] {
  const raw = plan.benefits_json;
  return Array.isArray(raw) ? raw.filter((b): b is string => typeof b === "string") : [];
}

/** Campos do plano usados nas telas públicas (sem select("*")). */
export const PLAN_PUBLIC_SELECT =
  "id,code,name,description,target_role,price,period,benefits_json,highlight,highlight_label,listing_limit,machine_limit,commission_percent,active,sort_order";

export async function fetchMembershipPlans() {
  const { data, error } = await supabase
    .from("membership_plans")
    .select(PLAN_PUBLIC_SELECT)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyMembershipRequests(userId: string) {
  const { data, error } = await supabase
    .from("membership_requests")
    .select("*, membership_plans(id,name,code,price,period)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MembershipRequestWithPlan[];
}

/**
 * Referência interna da cobrança. É o identificador enviado ao provedor de
 * pagamento (external reference) e usado pelo webhook para localizar a
 * solicitação. Não confirma pagamento nenhum por si só.
 */
function chargeReference() {
  return `DDP-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

/** Situação da cobrança online (flag operacional lida do banco). */
export async function fetchPaymentsEnabled(): Promise<boolean> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "payments_enabled")
    .maybeSingle();
  return Boolean((data?.value as { enabled?: boolean } | null)?.enabled);
}

export async function createMembershipRequest(params: {
  userId: string;
  plan: Pick<MembershipPlan, "id" | "price" | "target_role">;
  method: string;
  notes?: string;
}) {
  const { data, error } = await supabase
    .from("membership_requests")
    .insert({
      user_id: params.userId,
      plan_id: params.plan.id,
      requested_role: params.plan.target_role,
      amount: params.plan.price,
      payment_method: params.method,
      payment_reference: chargeReference(),
      applicant_notes: params.notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Registro de pagamento conferido manualmente pela administração.
 * O caminho normal é o webhook do provedor; isto cobre comprovante conferido
 * fora do gateway e fica registrado na auditoria.
 */
export async function adminConfirmMembershipPayment(
  requestId: string,
  method: string,
  reference: string,
) {
  const { error } = await supabase.rpc("admin_confirm_membership_payment", {
    _request_id: requestId,
    _method: method,
    _reference: reference,
  });
  if (error) throw error;
}

export async function cancelMembershipRequest(requestId: string) {
  const { error } = await supabase.rpc("cancel_membership_request", { _request_id: requestId });
  if (error) throw error;
}

/* ---------- Admin ---------- */

export type AdminMembershipRequest = MembershipRequestWithPlan & {
  profiles: {
    id: string;
    full_name: string;
    email: string;
    city: string | null;
    state: string | null;
  } | null;
};

export async function fetchAdminMembershipRequests(status?: string) {
  let query = supabase
    .from("membership_requests")
    .select("*, membership_plans(id,name,code,price,period)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status as never);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as MembershipRequestWithPlan[];
  if (rows.length === 0) return [] as AdminMembershipRequest[];

  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, city, state")
    .in("id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({
    ...r,
    profiles: byId.get(r.user_id) ?? null,
  })) as AdminMembershipRequest[];
}

export async function reviewMembershipRequest(requestId: string, approve: boolean, notes?: string) {
  const { error } = await supabase.rpc("admin_review_membership", {
    _request_id: requestId,
    _approve: approve,
    ...(notes ? { _notes: notes } : {}),
  });
  if (error) throw error;
}
