import { supabase } from "@/integrations/supabase/client";

const BUCKET = "machine-documents";

export type MachineDocType = "crlv" | "nota_fiscal" | "laudo_tecnico" | "manutencao" | "outro";

export const DOC_TYPE_LABEL: Record<MachineDocType, string> = {
  crlv: "CRLV / documento",
  nota_fiscal: "Nota fiscal",
  laudo_tecnico: "Laudo técnico",
  manutencao: "Comprovante de manutenção",
  outro: "Outro documento",
};

export const DOC_STATUS_LABEL: Record<string, string> = {
  pending: "Em análise",
  approved: "Verificado",
  rejected: "Recusado",
};

export const VERIFICATION_LABEL: Record<string, string> = {
  unverified: "Sem documentos",
  pending: "Documentos em análise",
  verified: "Documentação verificada",
  rejected: "Documentação recusada",
};

/** Documentos e laudos de uma máquina (dono ou administrador). */
export async function fetchMachineDocuments(machineId: string) {
  const { data, error } = await supabase
    .from("machine_documents")
    .select("id,machine_id,doc_type,title,file_path,file_name,status,review_notes,created_at")
    .eq("machine_id", machineId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadMachineDocument(params: {
  ownerId: string;
  machineId: string;
  file: File;
  docType: MachineDocType;
  title?: string;
}) {
  const { ownerId, machineId, file, docType, title } = params;
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `${ownerId}/${machineId}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) throw upErr;

  const { error } = await supabase.from("machine_documents").insert({
    machine_id: machineId,
    owner_id: ownerId,
    doc_type: docType,
    title: title?.trim() || null,
    file_path: path,
    file_name: file.name,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

export async function deleteMachineDocument(docId: string, filePath: string) {
  const { error } = await supabase.from("machine_documents").delete().eq("id", docId);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([filePath]);
}

/** Link temporário para abrir o arquivo privado. */
export async function machineDocumentUrl(filePath: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 300);
  if (error) throw error;
  return data.signedUrl;
}

/** Histórico próprio da máquina (manutenções, reparos, uso). */
export async function fetchMachineEvents(machineId: string) {
  const { data, error } = await supabase
    .from("machine_events")
    .select("id,event_date,title,description,hours_at_event")
    .eq("machine_id", machineId)
    .order("event_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addMachineEvent(params: {
  ownerId: string;
  machineId: string;
  eventDate: string;
  title: string;
  description?: string;
  hours?: string;
}) {
  const { error } = await supabase.from("machine_events").insert({
    machine_id: params.machineId,
    owner_id: params.ownerId,
    event_date: params.eventDate,
    title: params.title.trim(),
    description: params.description?.trim() || null,
    hours_at_event: params.hours ? Number(params.hours) : null,
  });
  if (error) throw error;
}

export async function deleteMachineEvent(eventId: string) {
  const { error } = await supabase.from("machine_events").delete().eq("id", eventId);
  if (error) throw error;
}

/** Fila de verificação da equipe DDP AGRO. */
export async function fetchDocumentsForReview(status: "pending" | "approved" | "rejected") {
  const { data, error } = await supabase
    .from("machine_documents")
    .select(
      "id,doc_type,title,file_path,file_name,status,review_notes,created_at,owner_id,machines(brand,model,manufacture_year,verification_status)",
    )
    .eq("status", status)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function reviewMachineDocument(docId: string, approve: boolean, notes?: string) {
  const { error } = await supabase.rpc("review_machine_document", {
    _doc_id: docId,
    _approve: approve,
    _notes: notes?.trim() || undefined,
  });
  if (error) throw error;
}
