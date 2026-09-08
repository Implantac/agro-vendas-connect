import logoAsset from "@/assets/logo.png.asset.json";
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
    <span className={cn("inline-flex items-center gap-3", className)}>
      <img
        src={logoAsset.url}
        alt="DDP AGRO"
        width={56}
        height={56}
        className="h-14 w-14 shrink-0 object-contain"
      />
      {variant === "horizontal" && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-xl font-bold tracking-tight",
              tone === "light" ? "text-primary-foreground" : "text-forest",
            )}
          >
            DDP <span className="text-accent">AGRO</span>
          </span>
          <span
            className={cn(
              "mt-1 text-[11px] font-medium uppercase tracking-[0.18em]",
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
