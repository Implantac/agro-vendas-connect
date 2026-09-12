import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DOC_TYPE_LABEL,
  VERIFICATION_LABEL,
  fetchDocumentsForReview,
  machineDocumentUrl,
  reviewMachineDocument,
  type MachineDocType,
} from "@/lib/machine-docs";

export const Route = createFileRoute("/app/admin/verificacoes")({
  head: () => ({
    meta: [
      { title: "Verificação de documentos | DDP AGRO" },
      {
        name: "description",
        content: "Análise dos documentos e laudos enviados pelos vendedores para cada máquina.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Verificacoes,
});

type Status = "pending" | "approved" | "rejected";

function Verificacoes() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["admin-machine-docs", status],
    queryFn: () => fetchDocumentsForReview(status),
  });

  async function open(path: string) {
    try {
      window.open(await machineDocumentUrl(path), "_blank", "noopener");
    } catch {
      toast.error("Não foi possível abrir o arquivo.");
    }
  }

  async function review(id: string, approve: boolean) {
    try {
      await reviewMachineDocument(id, approve, notes[id]);
      toast.success(approve ? "Documento verificado." : "Documento recusado.");
      setNotes((n) => ({ ...n, [id]: "" }));
      void queryClient.invalidateQueries({ queryKey: ["admin-machine-docs"] });
    } catch {
      toast.error("Não foi possível concluir a análise.");
    }
  }

  return (
    <AppPage>
      <h1 className="text-2xl font-bold tracking-tight text-forest">Verificação de documentos</h1>
      <p className="text-sm text-muted-foreground">
        Confira CRLV, notas fiscais e laudos enviados pelos vendedores. Só o que for aprovado aqui
        vira o selo “Documentação verificada” no anúncio.
      </p>

      <Tabs value={status} onValueChange={(v) => setStatus(v as Status)} className="mt-6">
        <TabsList>
          <TabsTrigger value="pending">Em análise</TabsTrigger>
          <TabsTrigger value="approved">Verificados</TabsTrigger>
          <TabsTrigger value="rejected">Recusados</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando documentos...</p>
        ) : docs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhum documento nesta lista.
          </div>
        ) : (
          docs.map((doc) => {
            const machine = doc.machines as {
              brand: string | null;
              model: string | null;
              manufacture_year: number | null;
              verification_status: string;
            } | null;
            return (
              <div key={doc.id} className="rounded-lg border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-forest">
                      {[machine?.brand, machine?.model].filter(Boolean).join(" ") ||
                        "Máquina sem identificação"}
                      {machine?.manufacture_year ? ` · ${machine.manufacture_year}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {DOC_TYPE_LABEL[doc.doc_type as MachineDocType]}
                      {doc.title ? ` · ${doc.title}` : ""} · enviado em{" "}
                      {new Date(doc.created_at).toLocaleDateString("pt-BR")} ·{" "}
                      {VERIFICATION_LABEL[machine?.verification_status ?? "unverified"]}
                    </p>
                    {doc.review_notes && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Observação: {doc.review_notes}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void open(doc.file_path)}>
                    <FileText className="mr-1.5 h-4 w-4" /> Abrir arquivo
                  </Button>
                </div>

                {status === "pending" && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={notes[doc.id] ?? ""}
                      onChange={(e) => setNotes((n) => ({ ...n, [doc.id]: e.target.value }))}
                      placeholder="Observação da análise (opcional)"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={() => void review(doc.id, true)}
                      >
                        <BadgeCheck className="mr-1.5 h-4 w-4" /> Verificar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void review(doc.id, false)}>
                        <X className="mr-1.5 h-4 w-4" /> Recusar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </AppPage>
  );
}
