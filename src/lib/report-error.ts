import { toast } from "sonner";
import { logSystemEvent, type EventCategory } from "@/lib/observability";

/** Mensagem única mostrada ao usuário — nunca o erro técnico cru. */
export const GENERIC_ERROR_MESSAGE = "Não foi possível concluir esta operação.";

export interface ReportErrorOptions {
  /** Operação em curso, ex.: "criar proposta". */
  operation: string;
  category?: EventCategory;
  /** Dados mínimos de contexto (nunca dados sensíveis). */
  context?: Record<string, unknown>;
  /** Ação de nova tentativa oferecida ao usuário. */
  retry?: () => void;
}

function technicalMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Registra o erro tecnicamente (rota, usuário, operação, horário, contexto)
 * e mostra ao usuário uma mensagem padronizada com opção de tentar de novo
 * ou falar com o suporte.
 */
export function reportError(error: unknown, options: ReportErrorOptions): void {
  const route = typeof window === "undefined" ? "ssr" : window.location.pathname;
  const eventId = crypto.randomUUID();

  void logSystemEvent(
    "error",
    options.operation,
    technicalMessage(error),
    {
      ...options.context,
      route,
      event_id: eventId,
      occurred_at: new Date().toISOString(),
    },
    options.category ?? "system",
  );

  toast.error(GENERIC_ERROR_MESSAGE, {
    description: `Código de referência: ${eventId.slice(0, 8)}`,
    action: options.retry
      ? { label: "Tentar novamente", onClick: options.retry }
      : { label: "Falar com suporte", onClick: () => window.open("/contato", "_self") },
  });
}
