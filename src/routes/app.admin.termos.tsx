import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { formatDateTimeBR } from "@/lib/format";

export const Route = createFileRoute("/app/admin/termos")({
  head: () => ({
    meta: [
      { title: "Termos e versões | Admin DDP AGRO" },
      {
        name: "description",
        content: "Publique novas versões dos termos, privacidade e ciência de riscos.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminTerms,
});

const DOC_TYPES = [
  { value: "terms", label: "Termos de uso" },
  { value: "privacy", label: "Política de privacidade" },
  { value: "liability", label: "Ciência de riscos" },
  { value: "cookies", label: "Política de cookies" },
];

interface DocRow {
  id: string;
  doc_type: string;
  title: string;
  version: string;
  published: boolean;
  published_at: string;
  content_md: string;
}

function AdminTerms() {
  const qc = useQueryClient();
  const [docType, setDocType] = useState("terms");
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["admin", "legal-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_documents")
        .select("id,doc_type,title,version,published,published_at,content_md")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "legal-documents"] });
    void qc.invalidateQueries({ queryKey: ["legal"] });
  };

  const publish = useMutation({
    mutationFn: async () => {
      const { error: unpublish } = await supabase
        .from("legal_documents")
        .update({ published: false })
        .eq("doc_type", docType)
        .eq("published", true);
      if (unpublish) throw unpublish;
      const { error } = await supabase.from("legal_documents").insert({
        doc_type: docType,
        title: title.trim(),
        version: version.trim(),
        content_md: content,
        published: true,
        published_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setVersion("");
      setTitle("");
      setContent("");
      toast.success("Nova versão publicada.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível publicar a versão."),
  });

  return (
    <AppPage>
      <h1 className="font-display text-2xl font-bold text-forest">Termos e versões</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada publicação cria uma nova versão. A anterior fica no histórico, com os aceites já
        registrados.
      </p>

      <form
        className="mt-6 space-y-4 rounded-lg border border-border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !version.trim() || content.trim().length < 20) {
            toast.error("Preencha título, versão e o texto do documento.");
            return;
          }
          publish.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Documento</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="doc-version">Versão</Label>
            <Input
              id="doc-version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Ex.: 2.0"
            />
          </div>
          <div>
            <Label htmlFor="doc-title">Título</Label>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="doc-content">Texto (markdown)</Label>
          <Textarea
            id="doc-content"
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={publish.isPending}>
          Publicar nova versão
        </Button>
      </form>

      <h2 className="mt-8 font-display text-lg font-semibold text-forest">Histórico</h2>
      {isLoading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-secondary/60" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
          <FileText className="h-9 w-9 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum documento publicado.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {docs.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="font-display text-base font-semibold text-forest">
                  {d.title} <span className="text-sm font-normal">v{d.version}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {DOC_TYPES.find((t) => t.value === d.doc_type)?.label ?? d.doc_type} •{" "}
                  {formatDateTimeBR(d.published_at)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  d.published
                    ? "bg-accent/15 text-accent-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {d.published ? "Publicado" : "Histórico"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AppPage>
  );
}
