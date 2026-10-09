import { cn } from "@/lib/utils";
import { LISTING_STATUS_LABELS, ORDER_STATUS_LABELS, PROPOSAL_STATUS_LABELS } from "@/lib/format";

/**
 * Badge de status com a mesma cor para o mesmo significado em todo o app.
 * Tons: sucesso (concluído/aceito), atenção (aguardando ação), erro (recusado/cancelado),
 * info (em andamento) e neutro (rascunho, arquivado, expirado).
 */
type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success/15 text-forest ring-success/50",
  warning: "bg-warning/20 text-forest ring-warning/60",
  danger: "bg-destructive/10 text-destructive ring-destructive/40",
  info: "bg-primary/10 text-primary ring-primary/40",
  neutral: "bg-secondary text-forest ring-border",
};

const TONES: Record<"listing" | "proposal" | "order", Record<string, Tone>> = {
  listing: {
    draft: "neutral",
    in_review: "warning",
    approved: "success",
    rejected: "danger",
    paused: "neutral",
    sold: "success",
    archived: "neutral",
  },
  proposal: {
    open: "info",
    countered: "warning",
    accepted: "success",
    rejected: "danger",
    expired: "neutral",
    cancelled: "danger",
  },
  order: {
    created: "info",
    awaiting_payment: "warning",
    paid: "success",
    in_delivery: "info",
    completed: "success",
    cancelled: "danger",
  },
};

const LABELS = {
  listing: LISTING_STATUS_LABELS,
  proposal: PROPOSAL_STATUS_LABELS,
  order: ORDER_STATUS_LABELS,
} as const;

export function StatusBadge({
  kind,
  status,
  className,
}: {
  kind: "listing" | "proposal" | "order";
  status: string;
  className?: string;
}) {
  const tone: Tone = TONES[kind][status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        TONE_CLASS[tone],
        className,
      )}
    >
      {LABELS[kind][status] ?? status}
    </span>
  );
}
