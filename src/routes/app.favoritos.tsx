import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { ListingCard } from "@/components/catalog/ListingCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyFavorites } from "@/lib/app-queries";

export const Route = createFileRoute("/app/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos | DDP AGRO" },
      { name: "description", content: "Máquinas e implementos salvos como favoritos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Favoritos,
});

function Favoritos() {
  const { user } = useAuth();
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: () => fetchMyFavorites(user!.id),
    enabled: Boolean(user),
  });

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Favoritos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Máquinas que você salvou para acompanhar de perto.
      </p>

      {isLoading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <Heart className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-lg font-semibold text-forest">
            Nenhum favorito ainda
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Toque no coração de um anúncio para salvá-lo aqui e acompanhar depois.
          </p>
          <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app/comprar">Explorar catálogo</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((f, i) => (
            <ListingCard key={f.id} listing={f.listings as never} index={i} />
          ))}
        </div>
      )}
    </AppPage>
  );
}
