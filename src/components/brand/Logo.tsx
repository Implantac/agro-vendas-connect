import symbol from "@/assets/ddp-symbol.png";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  variant = "horizontal",
  tone = "dark",
}: {
  className?: string;
  variant?: "horizontal" | "symbol";
  tone?: "dark" | "light";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src={symbol}
        alt="Símbolo DDP AGRO"
        width={40}
        height={40}
        className="h-9 w-9 shrink-0"
      />
      {variant === "horizontal" && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-lg font-bold tracking-tight",
              tone === "light" ? "text-primary-foreground" : "text-forest",
            )}
          >
            DDP <span className="text-accent">AGRO</span>
          </span>
          <span
            className={cn(
              "mt-1 text-[10px] font-medium uppercase tracking-[0.18em]",
              tone === "light" ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            Negócios agrícolas
          </span>
        </span>
      )}
    </span>
  );
}
