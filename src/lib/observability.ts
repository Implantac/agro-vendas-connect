import { supabase } from "@/integrations/supabase/client";

export type EventSeverity = "info" | "warning" | "error" | "critical";

export interface SystemEvent {
  id: string;
  severity: EventSeverity;
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
): Promise<void> {
  try {
    await supabase.rpc("log_system_event", {
      _severity: severity,
      _source: source,
      _message: message,
      _context: context as never,
    });
  } catch {
    // silencioso por design
  }
}

export async function fetchSystemEvents(severity?: EventSeverity): Promise<SystemEvent[]> {
  let query = supabase
    .from("system_events")
    .select("id,severity,source,message,context,user_id,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (severity) query = query.eq("severity", severity);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SystemEvent[];
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
      .eq("status", "payment_pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "payment_pending")
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
