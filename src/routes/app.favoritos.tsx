import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, FolderPlus, Heart, Scale } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { ListingCard, type ListingCardData } from "@/components/catalog/ListingCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyFavorites } from "@/lib/app-queries";
import { fetchPriceHistory, setFavoriteList } from "@/features/listings/queries";
import { formatBRL, LISTING_STATUS_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/favoritos")({
  head: () => ({
    meta: [
      { title: "Minhas máquinas | DDP AGRO" },
      {
        name: "description",
        content: "Máquinas salvas, organizadas em listas, com acompanhamento de preço.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Favoritos,
});

const SEM_LISTA = "Sem lista";

function Favoritos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [listInput, setListInput] = useState("");

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: () => fetchMyFavorites(user!.id),
    enabled: Boolean(user),
  });

  const listingIds = favorites.map((f) => (f.listings as { id: string }).id);
  const { data: history = [] } = useQuery({
    queryKey: ["price-history", listingIds.join(",")],
    queryFn: () => fetchPriceHistory(listingIds),
    enabled: listingIds.length > 0,
  });

  const priceDelta = useMemo(() => {
    const map = new Map<string, { old: number | null; now: number | null; at: string }>();
    for (const h of history) {
      if (!map.has(h.listing_id))
        map.set(h.listing_id, { old: h.old_price, now: h.new_price, at: h.changed_at });
    }
    return map;
  }, [history]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof favorites>();
    for (const f of favorites) {
      const key = (f as { list_name?: string | null }).list_name || SEM_LISTA;
      m.set(key, [...(m.get(key) ?? []), f]);
    }
    return [...m.entries()].sort(([a], [b]) =>
      a === SEM_LISTA ? 1 : b === SEM_LISTA ? -1 : a.localeCompare(b),
    );
  }, [favorites]);

  const move = useMutation({
    mutationFn: ({ id, list }: { id: string; list: string | null }) => setFavoriteList(id, list),
    onSuccess: () => {
      toast.success("Lista atualizada");
      setEditing(null);
      setListInput("");
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
    onError: () => toast.error("Não foi possível mover para a lista."),
  });

  function toggleSelect(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id],
    );
  }

  return (
    <AppPage>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">
            Minhas máquinas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Máquinas salvas, organizadas em listas. Selecione até 3 para comparar.
          </p>
        </div>
        <Button
          asChild={selected.length >= 2}
          disabled={selected.length < 2}
          className="bg-forest hover:bg-forest/90"
        >
          {selected.length >= 2 ? (
            <Link to="/app/comparar" search={{ ids: selected.join(",") }}>
              <Scale className="mr-2 h-4 w-4" /> Comparar ({selected.length})
            </Link>
          ) : (
            <span>
              <Scale className="mr-2 inline h-4 w-4" /> Comparar ({selected.length}/3)
            </span>
          )}
        </Button>
      </div>

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
            Nenhuma máquina salva ainda
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Toque no coração de um anúncio para salvá-lo aqui, organizar em listas e acompanhar
            preço e disponibilidade.
          </p>
          <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app/comprar">Buscar máquinas</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map(([name, items]) => (
            <section key={name}>
              <h2 className="mb-4 font-display text-base font-semibold text-forest">
                {name} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((f, i) => {
                  const l = f.listings as ListingCardData & { status: string; price: number | null };
                  const delta = priceDelta.get(l.id);
                  const checked = selected.includes(l.id);
                  const unavailable = l.status !== "approved";
                  return (
                    <div key={f.id} className="flex flex-col gap-2">
                      <div className={cn("relative", unavailable && "opacity-70")}>
                        <ListingCard listing={l} index={i} />
                        <label className="absolute left-3 bottom-3 z-10 inline-flex cursor-pointer items-center gap-2 rounded-sm bg-background/95 px-2 py-1 text-xs font-medium text-forest shadow">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleSelect(l.id)}
                            aria-label="Selecionar para comparar"
                          />
                          Comparar
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                        {unavailable ? (
                          <span className="rounded-sm bg-warning/15 px-2 py-0.5 font-semibold text-warning">
                            {LISTING_STATUS_LABELS[l.status] ?? "Indisponível"}
                          </span>
                        ) : delta && delta.old != null && delta.now != null && delta.old !== delta.now ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 font-semibold",
                              delta.now < delta.old
                                ? "bg-success/10 text-success"
                                : "bg-warning/15 text-warning",
                            )}
                          >
                            {delta.now < delta.old ? (
                              <ArrowDownRight className="h-3 w-3" />
                            ) : (
                              <ArrowUpRight className="h-3 w-3" />
                            )}
                            {delta.now < delta.old ? "Baixou de" : "Subiu de"} {formatBRL(delta.old)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Disponível</span>
                        )}
                        {editing === f.id ? (
                          <form
                            className="flex items-center gap-1"
                            onSubmit={(e) => {
                              e.preventDefault();
                              move.mutate({ id: f.id, list: listInput });
                            }}
                          >
                            <Input
                              autoFocus
                              value={listInput}
                              onChange={(e) => setListInput(e.target.value)}
                              placeholder="Nome da lista"
                              className="h-7 w-40 text-xs"
                              list="listas-existentes"
                            />
                            <Button type="submit" size="sm" className="h-7 px-2 text-xs">
                              OK
                            </Button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(f.id);
                              setListInput(name === SEM_LISTA ? "" : name);
                            }}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-forest"
                          >
                            <FolderPlus className="h-3.5 w-3.5" />
                            {name === SEM_LISTA ? "Adicionar a uma lista" : "Mover"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          <datalist id="listas-existentes">
            {groups
              .filter(([n]) => n !== SEM_LISTA)
              .map(([n]) => (
                <option key={n} value={n} />
              ))}
          </datalist>
        </div>
      )}
    </AppPage>
  );
}
