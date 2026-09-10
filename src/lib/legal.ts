import { supabase } from "@/integrations/supabase/client";

/** Documentos cujo aceite é obrigatório no cadastro. */
export const REQUIRED_ACCEPTANCE_DOCS = ["terms", "privacy", "liability"] as const;

/**
 * Registra o aceite eletrônico das versões publicadas dos documentos obrigatórios.
 * Guarda o user agent; o IP é registrado apenas quando disponível no ambiente.
 */
export async function recordLegalAcceptances(userId: string) {
  const { data: docs, error } = await supabase
    .from("legal_documents")
    .select("id,doc_type,version")
    .eq("published", true)
    .in("doc_type", [...REQUIRED_ACCEPTANCE_DOCS]);
  if (error) throw error;
  if (!docs?.length) return;

  const userAgent = typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 400);
  const rows = docs.map((d) => ({
    user_id: userId,
    document_id: d.id,
    user_agent: userAgent,
  }));

  const { error: insertError } = await supabase.from("legal_acceptances").insert(rows);
  if (insertError) throw insertError;
}

export interface PendingLegalDoc {
  id: string;
  doc_type: string;
  version: string;
  title: string;
}

export const LEGAL_DOC_ROUTE: Record<string, string> = {
  terms: "/termos-de-uso",
  privacy: "/politica-de-privacidade",
  liability: "/termo-de-aceite",
};

/** Documentos obrigatórios publicados que o usuário ainda não aceitou (reaceite por versão). */
export async function fetchPendingLegalDocs(userId: string): Promise<PendingLegalDoc[]> {
  const [{ data: docs, error }, { data: accepted, error: accErr }] = await Promise.all([
    supabase
      .from("legal_documents")
      .select("id,doc_type,version,title")
      .eq("published", true)
      .in("doc_type", [...REQUIRED_ACCEPTANCE_DOCS]),
    supabase.from("legal_acceptances").select("document_id").eq("user_id", userId),
  ]);
  if (error) throw error;
  if (accErr) throw accErr;

  const acceptedIds = new Set((accepted ?? []).map((a) => a.document_id));
  return (docs ?? [])
    .filter((d) => !acceptedIds.has(d.id))
    .map((d) => ({
      id: d.id,
      doc_type: d.doc_type,
      version: d.version,
      title: d.title ?? d.doc_type,
    }));
}

/** Registra o aceite das versões pendentes informadas. */
export async function acceptLegalDocs(userId: string, documentIds: string[]) {
  if (!documentIds.length) return;
  const userAgent = typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 400);
  const { error } = await supabase.from("legal_acceptances").insert(
    documentIds.map((document_id) => ({
      user_id: userId,
      document_id,
      user_agent: userAgent,
    })),
  );
  if (error) throw error;
}
