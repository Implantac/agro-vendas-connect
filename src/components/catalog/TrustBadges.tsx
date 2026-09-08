import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TrustBadge } from "@/features/listings/trust";
import { cn } from "@/lib/utils";

export function TrustBadges({
  badges,
  className,
  compact = false,
}: {
  badges: TrustBadge[];
  className?: string;
  compact?: boolean;
}) {
  if (!badges.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Indicadores de confiança">
      {badges.map((b) => (
        <li key={b.key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-sm border border-success/30 bg-success/10 font-medium text-success",
                  compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]",
                )}
              >
                <ShieldCheck className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} /> {b.label}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{b.hint}</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
