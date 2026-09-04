import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, BookmarkPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import type { CatalogFilters } from "@/features/catalog/useCatalogFilters";
import {
  createSavedSearch,
  deleteSavedSearch,
  describeFilters,
  fetchSavedSearches,
  jsonToSearchParams,
  toggleSavedSearchAlerts,
} from "@/lib/saved-searches";

export function SavedSearches({ filters }: { filters: CatalogFilters }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [alerts, setAlerts] = useState(true);

  const { data: searches = [] } = useQuery({
    queryKey: ["saved-searches", user?.id],
    queryFn: () => fetchSavedSearches(user!.id),
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["saved-searches"] });

  const save = useMutation({
    mutationFn: () => createSavedSearch(user!.id, name.trim(), filters, alerts),
    onSuccess: () => {
      toast.success(
        alerts
          ? "Busca salva. Avisaremos quando uma máquina desse perfil for publicada."
          : "Busca salva.",
      );
      setOpen(false);
      setName("");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => toggleSavedSearchAlerts(v.id, v.enabled),
    onSuccess: () => void invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSavedSearch(id),
    onSuccess: () => {
      toast.success("Busca removida.");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) return null;

  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-forest">Buscas salvas</h2>
          <p className="text-xs text-muted-foreground">
            Salve o perfil de máquina que você procura e receba aviso quando um anúncio novo
            aparecer.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <BookmarkPlus className="mr-2 h-4 w-4" />
              Salvar esta busca
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar busca</DialogTitle>
              <DialogDescription>{describeFilters({ ...filtersPreview(filters) })}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="saved-search-name">Nome da busca</Label>
                <Input
                  id="saved-search-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Trator John Deere até R$ 400 mil"
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <Label htmlFor="saved-search-alerts" className="text-sm font-normal">
                  Receber aviso de novas máquinas
                </Label>
                <Switch id="saved-search-alerts" checked={alerts} onCheckedChange={setAlerts} />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => save.mutate()}
                disabled={!name.trim() || save.isPending}
              >
                {save.isPending ? "Salvando..." : "Salvar busca"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {searches.length > 0 && (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {searches.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <Link
                  to="/app/comprar"
                  search={jsonToSearchParams(s.filters_json)}
                  className="text-sm font-medium text-forest hover:underline"
                >
                  {s.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {describeFilters(s.filters_json)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                title={s.alerts_enabled ? "Desativar avisos" : "Ativar avisos"}
                onClick={() => toggle.mutate({ id: s.id, enabled: !s.alerts_enabled })}
              >
                {s.alerts_enabled ? (
                  <Bell className="h-4 w-4 text-accent" />
                ) : (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Remover busca"
                onClick={() => remove.mutate(s.id)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function filtersPreview(filters: CatalogFilters): Record<string, unknown> {
  const { sort: _sort, page: _page, ...rest } = filters;
  return rest as Record<string, unknown>;
}
