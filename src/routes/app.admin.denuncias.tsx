import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/app/admin/denuncias")({
  head: () => ({
    meta: [
      { title: "Denúncias | Admin DDP AGRO" },
      { name: "description", content: "Analise denúncias de anúncios e usuários da plataforma." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReports,
});

function AdminReports() {
  const qc = useQueryClient();
  const { data: reports = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id,reason,details,status,created_at,listing_id,listings(title,slug)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const resolve = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Denúncia atualizada.");
      void qc.invalidateQueries({ queryKey: ["admin", "reports"] });
    },
    onError: () => toast.error("Não foi possível atualizar a denúncia."),
  });

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest">Denúncias</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Avalie relatos de anúncios suspeitos e registre a decisão.
      </p>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar as denúncias.
        </p>
      ) : reports.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
          <Flag className="h-9 w-9 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma denúncia registrada.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {reports.map((r) => {
            const listing = r.listings as { title: string } | null;
            return (
              <div key={r.id} className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-forest">
                    {listing?.title ?? "Denúncia geral"}
                  </p>
                  <p className="mt-1 text-sm text-forest">{r.reason}</p>
                  {r.details && <p className="mt-1 text-sm text-muted-foreground">{r.details}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTimeBR(r.created_at)} • status: {r.status}
                  </p>
                </div>
                {r.status === "open" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolve.mutate({ id: r.id, status: "dismissed" })}
                    >
                      Descartar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={() => resolve.mutate({ id: r.id, status: "resolved" })}
                    >
                      Marcar resolvida
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppPage>
  );
}
