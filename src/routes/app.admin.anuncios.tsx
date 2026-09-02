import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { fetchAdminListings, moderateListing } from "@/lib/admin-queries";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admin/anuncios")({
  head: () => ({
    meta: [
      { title: "Anúncios | Admin DDP AGRO" },
      { name: "description", content: "Moderação dos anúncios de implementos usados." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminListings,
});

const FILTERS = [
  { value: "in_review", label: "Em análise" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Rejeitados" },
  { value: "", label: "Todos" },
] as const;

function AdminListings() {
  const [status, setStatus] = useState<string>("in_review");
  const qc = useQueryClient();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["admin", "listings", status],
    queryFn: () => fetchAdminListings(status || undefined),
  });

  const mutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: "approved" | "rejected" | "archived" }) =>
      moderateListing(id, next),
    onSuccess: () => {
      toast.success("Anúncio moderado.");
      void qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error("Não foi possível moderar.", { description: e.message }),
  });

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest">Anúncios</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Aprove, rejeite ou arquive anúncios de implementos agrícolas usados.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatus(f.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              status === f.value
                ? "border-accent bg-secondary text-forest"
                : "border-border text-muted-foreground hover:text-forest",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-border bg-card">
        <ul className="divide-y divide-border">
          {isLoading && <li className="px-5 py-6 text-sm text-muted-foreground">Carregando...</li>}
          {!isLoading && listings.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted-foreground">Nenhum anúncio nesta situação.</li>
          )}
          {listings.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-medium text-forest">{l.title}</p>
                <p className="text-xs text-muted-foreground">
                  {l.price ? formatBRL(Number(l.price)) : "Sob consulta"} • {l.status}
                  {l.city ? ` • ${l.city}/${l.state ?? ""}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={mutation.isPending || l.status === "approved"}
                  onClick={() => mutation.mutate({ id: l.id, next: "approved" })}
                >
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutation.isPending || l.status === "rejected"}
                  onClick={() => mutation.mutate({ id: l.id, next: "rejected" })}
                >
                  Rejeitar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={mutation.isPending || l.status === "archived"}
                  onClick={() => mutation.mutate({ id: l.id, next: "archived" })}
                >
                  Arquivar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppPage>
  );
}
