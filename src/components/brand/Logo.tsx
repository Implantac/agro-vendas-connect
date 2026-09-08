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
    <span className={cn("inline-flex items-center", className)}>
      <img
        src={logoAsset}
        alt="DDP AGRO"
        width={124}
        height={148}
        className="shrink-0 object-contain"
      />
    </span>
  );
}
