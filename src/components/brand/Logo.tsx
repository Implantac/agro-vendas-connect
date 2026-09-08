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
    <span className={cn("inline-flex shrink-0 items-center gap-2.5", className)}>
      <img
        src={logoAsset}
        alt="DDP AGRO"
        width={364}
        height={447}
        className={cn(
          "block w-auto shrink-0 object-contain",
          variant === "symbol" ? "h-14" : "h-16 sm:h-[4.5rem]",
          tone === "light" && "brightness-0 invert",
        )}
      />
      <span
        className={cn(
          "border-l pl-2.5 font-display text-[11px] font-semibold uppercase leading-[1.2] tracking-wide text-forest sm:text-xs",
          tone === "light"
            ? "border-primary-foreground/30 text-primary-foreground/85"
            : "border-border",
        )}
      >
        Implementos
        <span className="block">agrícolas</span>
      </span>
    </span>
  );
}
