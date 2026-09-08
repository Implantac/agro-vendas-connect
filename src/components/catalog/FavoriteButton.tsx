import { Heart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchFavoriteIds, toggleFavorite } from "@/lib/app-queries";
import { cn } from "@/lib/utils";

/** Favoritar de verdade (só para membros aprovados). */
export function FavoriteButton({
  listingId,
  size = "sm",
  className,
  withLabel = false,
}: {
  listingId: string;
  size?: "sm" | "default";
  className?: string;
  withLabel?: boolean;
}) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const enabled = Boolean(user) && profile?.status === "approved";

  const { data: ids } = useQuery({
    queryKey: ["favorite-ids", user?.id],
    queryFn: () => fetchFavoriteIds(user!.id),
    enabled,
    staleTime: 30_000,
  });
  const isFav = ids?.has(listingId) ?? false;

  const toggle = useMutation({
    mutationFn: () => toggleFavorite(user!.id, listingId, isFav),
    onSuccess: (nowFav) => {
      toast.success(nowFav ? "Salvo em Minhas máquinas" : "Removido dos favoritos");
      void queryClient.invalidateQueries({ queryKey: ["favorite-ids"] });
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => toast.error("Não foi possível atualizar o favorito."),
  });

  if (!enabled) return null;

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      aria-pressed={isFav}
      aria-label={isFav ? "Remover dos favoritos" : "Favoritar"}
      className={cn(withLabel ? "" : "px-3", className)}
      disabled={toggle.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate();
      }}
    >
      <Heart className={cn("h-4 w-4", isFav && "fill-accent text-accent")} />
      {withLabel && <span className="ml-1.5">{isFav ? "Salvo" : "Favoritar"}</span>}
    </Button>
  );
}
