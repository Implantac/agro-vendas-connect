import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Eye,
  ListChecks,
  PauseCircle,
  Pencil,
  PlusCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyListings, updateListingStatus } from "@/lib/app-queries";
import { deleteListing } from "@/lib/listing-manage";
import { CONDITION_LABELS, formatBRL, LISTING_STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/meus-anuncios")({
  head: () => ({
    meta: [
      { title: "Meus anúncios | DDP AGRO" },
      { name: "description", content: "Gerencie seus anúncios de máquinas e implementos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MeusAnuncios,
});

function MeusAnuncios() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: () => fetchMyListings(user!.id),
    enabled: Boolean(user),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "paused" | "approved" | "archived" }) =>
      updateListingStatus(id, status),
    onSuccess: () => {
      toast.success("Anúncio atualizado.");
      void queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    },
    onError: () => toast.error("Não foi possível atualizar o anúncio."),
  });

  const removeListing = useMutation({
    mutationFn: (id: string) => deleteListing(id),
    onSuccess: () => {
      toast.success("Anúncio excluído.");
      void queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    },
    onError: () => toast.error("Não foi possível excluir o anúncio."),
  });

  return (
    <AppPage>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Meus anúncios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe status, visualizações e disponibilidade.
          </p>
        </div>
        <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/app/publicar">
            <PlusCircle className="mr-2 h-4 w-4" /> Publicar anúncio
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-lg font-semibold text-forest">
            Você ainda não tem anúncios
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Publique sua primeira máquina ou implemento e alcance compradores verificados.
          </p>
          <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app/publicar">Publicar agora</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {listings.map((l) => {
            const media = (l.listing_media as { url: string; is_cover: boolean }[] | null) ?? [];
            const cover = media.find((m) => m.is_cover) ?? media[0];
            return (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4"
              >
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-md bg-secondary">
                  {cover && (
                    <img src={cover.url} alt={l.title} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        l.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : l.status === "in_review"
                            ? "bg-secondary text-forest"
                            : l.status === "rejected"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      {LISTING_STATUS_LABELS[l.status] ?? l.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {CONDITION_LABELS[l.condition] ?? l.condition}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate font-display text-base font-semibold text-forest">
                    {l.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {l.price_on_request ? "Preço sob consulta" : formatBRL(l.price)} •{" "}
                    {l.views_count} visualizações
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {l.status === "approved" && (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/implementos/$slug" params={{ slug: l.slug }}>
                        <Eye className="mr-1.5 h-4 w-4" /> Ver
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link to="/app/anuncio/$id" params={{ id: l.id }}>
                      <Pencil className="mr-1.5 h-4 w-4" /> Editar
                    </Link>
                  </Button>
                  {l.status === "approved" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: l.id, status: "paused" })}
                    >
                      <PauseCircle className="mr-1.5 h-4 w-4" /> Pausar
                    </Button>
                  )}
                  {l.status === "paused" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: l.id, status: "approved" })}
                    >
                      <PlayCircle className="mr-1.5 h-4 w-4" /> Reativar
                    </Button>
                  )}
                  {["approved", "paused"].includes(l.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: l.id, status: "archived" })}
                    >
                      <Archive className="mr-1.5 h-4 w-4" /> Arquivar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={removeListing.isPending}
                    onClick={() => {
                      if (window.confirm("Excluir definitivamente este anúncio?"))
                        removeListing.mutate(l.id);
                    }}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppPage>
  );
}
