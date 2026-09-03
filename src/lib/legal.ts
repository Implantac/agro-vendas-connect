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
