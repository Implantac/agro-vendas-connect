import { supabase } from "@/integrations/supabase/client";

export type EventSeverity = "info" | "warning" | "error" | "critical";

/** Categorias operacionais usadas no painel administrativo. */
export const EVENT_CATEGORIES = [
  "auth",
  "payment",
  "membership",
  "listing",
  "machine",
  "proposal",
  "negotiation",
  "order",
  "document",
  "lgpd",
  "security",
  "system",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  auth: "Acesso",
  payment: "Pagamento",
  membership: "Membresia",
  listing: "Anúncio",
  machine: "Máquina",
  proposal: "Proposta",
  negotiation: "Negociação",
  order: "Pedido",
  document: "Documento",
  lgpd: "Privacidade",
  security: "Segurança",
  system: "Sistema",
};

export interface SystemEvent {
  id: string;
  severity: EventSeverity;
  category: EventCategory;
  source: string;
  message: string;
  context: Record<string, unknown>;
  user_id: string | null;
  created_at: string;
}

/**
 * Registra um evento operacional no banco (visível apenas para administradores).
 * Nunca lança: observabilidade não pode quebrar o fluxo do usuário.
 */
export async function logSystemEvent(
  severity: EventSeverity,
  source: string,
  message: string,
  context: Record<string, unknown> = {},
  category: EventCategory = "system",
): Promise<void> {
  try {
    await supabase.rpc("log_system_event", {
      _severity: severity,
      _source: source,
      _message: message,
      _context: context as never,
      _category: category,
    } as never);
  } catch {
    // silencioso por design
  }
}

export async function fetchSystemEvents(
  severity?: EventSeverity,
  category?: EventCategory,
): Promise<SystemEvent[]> {
  let query = supabase
    .from("system_events")
    .select("id,severity,category,source,message,context,user_id,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (severity) query = query.eq("severity", severity);
  if (category) query = query.eq("category", category as never);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as SystemEvent[];
}

export interface FinancialAlerts {
  ordersAwaitingPayment: number;
  ordersStuck7Days: number;
  criticalEvents: number;
}

/** Sinais financeiros que exigem atenção do administrador. */
export async function fetchFinancialAlerts(): Promise<FinancialAlerts> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [awaiting, stuck, critical] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_payment"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "awaiting_payment")
      .lt("created_at", sevenDaysAgo),
    supabase
      .from("system_events")
      .select("id", { count: "exact", head: true })
      .in("severity", ["error", "critical"]),
  ]);

  return {
    ordersAwaitingPayment: awaiting.count ?? 0,
    ordersStuck7Days: stuck.count ?? 0,
    criticalEvents: critical.count ?? 0,
  };
}
