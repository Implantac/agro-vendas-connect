import logoAsset from "@/assets/logo-cropped.png";
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
        src={logoAsset}
        alt="DDP AGRO"
        width={124}
        height={148}
        className="h-24 w-20 shrink-0 object-contain sm:h-28 sm:w-24"
      />
      {variant === "horizontal" && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-2xl font-bold tracking-tight sm:text-3xl",
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
