import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/app/admin/privacidade")({
  head: () => ({
    meta: [
      { title: "Solicitações de privacidade | Admin DDP AGRO" },
      {
        name: "description",
        content: "Atenda pedidos de acesso, correção e exclusão de dados pessoais (LGPD).",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPrivacy,
});

const REQUEST_LABEL: Record<string, string> = {
  access: "Acesso aos dados",
  correction: "Correção",
  deletion: "Exclusão",
  portability: "Portabilidade",
  revoke: "Revogação de consentimento",
};

const DEADLINE_DAYS = 15;

interface RequestRow {
  id: string;
  email: string;
  request_type: string;
  details: string | null;
  status: string;
  created_at: string;
  handled_at: string | null;
}

function AdminPrivacy() {
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin", "privacy-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("privacy_requests")
        .select("id,email,request_type,details,status,created_at,handled_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as RequestRow[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("privacy_requests")
        .update({
          status,
          handled_at: new Date().toISOString(),
          handled_by: auth.user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação atualizada.");
      void qc.invalidateQueries({ queryKey: ["admin", "privacy-requests"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível atualizar."),
  });

  function exportCsv() {
    const header = "email;tipo;status;criada_em;atendida_em;detalhes";
    const rows = requests.map((r) =>
      [
        r.email,
        REQUEST_LABEL[r.request_type] ?? r.request_type,
        r.status,
        r.created_at,
        r.handled_at ?? "",
        (r.details ?? "").replace(/[;\n]/g, " "),
      ].join(";"),
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "solicitacoes-privacidade.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function deadlineInfo(row: RequestRow) {
    const due = new Date(new Date(row.created_at).getTime() + DEADLINE_DAYS * 86400000);
    const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
    if (row.status !== "open") return { text: `Concluída em ${formatDateTimeBR(row.handled_at ?? row.created_at)}`, late: false };
    if (days < 0) return { text: `Atrasada há ${Math.abs(days)} dia(s)`, late: true };
    return { text: `Prazo em ${days} dia(s)`, late: days <= 3 };
  }

  return (
    <AppPage>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest">Privacidade (LGPD)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pedidos de titulares de dados. Prazo interno de resposta: {DEADLINE_DAYS} dias.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={requests.length === 0}>
          Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-14 text-center">
          <ShieldQuestion className="h-9 w-9 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma solicitação registrada.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {requests.map((r) => {
            const deadline = deadlineInfo(r);
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-forest">
                    {REQUEST_LABEL[r.request_type] ?? r.request_type}
                  </p>
                  <p className="text-sm text-forest">{r.email}</p>
                  {r.details && (
                    <p className="mt-1 text-sm text-muted-foreground">{r.details}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recebida em {formatDateTimeBR(r.created_at)} • status: {r.status}
                  </p>
                  <p
                    className={`mt-1 text-xs font-medium ${
                      deadline.late ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {deadline.text}
                  </p>
                </div>
                {r.status === "open" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus.mutate({ id: r.id, status: "rejected" })}
                    >
                      Recusar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={() => setStatus.mutate({ id: r.id, status: "done" })}
                    >
                      Marcar atendida
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </AppPage>
  );
}
