import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOC_STATUS_LABEL,
  DOC_TYPE_LABEL,
  addMachineEvent,
  deleteMachineDocument,
  deleteMachineEvent,
  fetchMachineDocuments,
  fetchMachineEvents,
  machineDocumentUrl,
  uploadMachineDocument,
  type MachineDocType,
} from "@/lib/machine-docs";

interface Props {
  machineId: string | null;
  machineName: string;
  ownerId: string;
  onOpenChange: (open: boolean) => void;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

export function MachineDossierDialog({ machineId, machineName, ownerId, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<MachineDocType>("crlv");
  const [docTitle, setDocTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [event, setEvent] = useState({
    date: TODAY(),
    title: "",
    description: "",
    hours: "",
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["machine-docs", machineId],
    queryFn: () => fetchMachineDocuments(machineId!),
    enabled: Boolean(machineId),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["machine-events", machineId],
    queryFn: () => fetchMachineEvents(machineId!),
    enabled: Boolean(machineId),
  });

  async function handleUpload(file: File | undefined) {
    if (!file || !machineId) return;
    setBusy(true);
    try {
      await uploadMachineDocument({ ownerId, machineId, file, docType, title: docTitle });
      toast.success("Documento enviado para análise da equipe.");
      setDocTitle("");
      if (fileRef.current) fileRef.current.value = "";
      void queryClient.invalidateQueries({ queryKey: ["machine-docs", machineId] });
      void queryClient.invalidateQueries({ queryKey: ["my-machines-full"] });
    } catch {
      toast.error("Não foi possível enviar o documento.");
    } finally {
      setBusy(false);
    }
  }

  async function openDoc(path: string) {
    try {
      const url = await machineDocumentUrl(path);
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Não foi possível abrir o arquivo.");
    }
  }

  async function removeDoc(id: string, path: string) {
    try {
      await deleteMachineDocument(id, path);
      void queryClient.invalidateQueries({ queryKey: ["machine-docs", machineId] });
      void queryClient.invalidateQueries({ queryKey: ["my-machines-full"] });
    } catch {
      toast.error("Só é possível remover documentos que ainda estão em análise.");
    }
  }

  async function saveEvent() {
    if (!machineId) return;
    if (!event.title.trim()) {
      toast.error("Descreva o que aconteceu com a máquina.");
      return;
    }
    setBusy(true);
    try {
      await addMachineEvent({
        ownerId,
        machineId,
        eventDate: event.date,
        title: event.title,
        description: event.description,
        hours: event.hours,
      });
      setEvent({ date: TODAY(), title: "", description: "", hours: "" });
      void queryClient.invalidateQueries({ queryKey: ["machine-events", machineId] });
      toast.success("Registro adicionado ao histórico.");
    } catch {
      toast.error("Não foi possível salvar o registro.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(id: string) {
    try {
      await deleteMachineEvent(id);
      void queryClient.invalidateQueries({ queryKey: ["machine-events", machineId] });
    } catch {
      toast.error("Não foi possível remover o registro.");
    }
  }

  return (
    <Dialog open={Boolean(machineId)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{machineName}</DialogTitle>
          <DialogDescription>
            Documentos, laudos e histórico desta máquina. Os arquivos são privados: só você e a
            equipe DDP AGRO têm acesso.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3">
          <h3 className="font-display text-base font-semibold text-forest">Documentos e laudos</h3>
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as MachineDocType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-title">Identificação (opcional)</Label>
              <Input
                id="doc-title"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Ex.: Laudo de revisão 2025"
              />
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => void handleUpload(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="w-full sm:w-auto"
          >
            <Upload className="mr-1.5 h-4 w-4" /> Enviar arquivo (PDF ou imagem, até 20 MB)
          </Button>

          <ul className="space-y-2">
            {docs.length === 0 ? (
              <li className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nenhum documento enviado. Anexe CRLV, nota fiscal ou laudo para receber o selo
                “Documentação verificada”.
              </li>
            ) : (
              docs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => void openDoc(doc.file_path)}
                      className="flex items-center gap-2 text-sm font-medium text-forest underline-offset-2 hover:underline"
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {doc.title || doc.file_name || "Documento enviado"}
                      </span>
                    </button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {DOC_TYPE_LABEL[doc.doc_type as MachineDocType]} ·{" "}
                      {DOC_STATUS_LABEL[doc.status] ?? doc.status}
                      {doc.review_notes ? ` · ${doc.review_notes}` : ""}
                    </p>
                  </div>
                  {doc.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void removeDoc(doc.id, doc.file_path)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="space-y-3 border-t border-border pt-5">
          <h3 className="font-display text-base font-semibold text-forest">Histórico da máquina</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="ev-date">Data</Label>
              <Input
                id="ev-date"
                type="date"
                value={event.date}
                onChange={(e) => setEvent((s) => ({ ...s, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ev-title">O que aconteceu *</Label>
              <Input
                id="ev-title"
                value={event.title}
                onChange={(e) => setEvent((s) => ({ ...s, title: e.target.value }))}
                placeholder="Ex.: Troca de óleo e filtros"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-hours">Horímetro</Label>
              <Input
                id="ev-hours"
                inputMode="numeric"
                value={event.hours}
                onChange={(e) =>
                  setEvent((s) => ({ ...s, hours: e.target.value.replace(/\D/g, "") }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ev-desc">Detalhes</Label>
              <Textarea
                id="ev-desc"
                rows={2}
                value={event.description}
                onChange={(e) => setEvent((s) => ({ ...s, description: e.target.value }))}
              />
            </div>
          </div>
          <Button disabled={busy} onClick={() => void saveEvent()} className="w-full sm:w-auto">
            Adicionar ao histórico
          </Button>

          <ul className="space-y-2">
            {events.length === 0 ? (
              <li className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nenhum registro ainda. O histórico aparece para quem visita o anúncio desta máquina.
              </li>
            ) : (
              events.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-forest">{ev.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(`${ev.event_date}T12:00:00`).toLocaleDateString("pt-BR")}
                      {ev.hours_at_event ? ` · ${ev.hours_at_event} h` : ""}
                      {ev.description ? ` · ${ev.description}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => void removeEvent(ev.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))
            )}
          </ul>
        </section>
      </DialogContent>
    </Dialog>
  );
}
