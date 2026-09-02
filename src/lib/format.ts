export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateBR(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(d);
}

export function formatDateTimeBR(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export const CONDITION_LABELS: Record<string, string> = {
  new: "Novo",
  semi_new: "Seminovo",
  used: "Usado",
};

/** Regra da plataforma: DDP AGRO negocia somente máquinas usadas/seminovas. */
export const SALE_CONDITION_LABELS: Record<string, string> = {
  semi_new: "Seminovo",
  used: "Usado",
};

export const LISTING_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  in_review: "Em análise",
  approved: "Aprovado",
  rejected: "Rejeitado",
  paused: "Pausado",
  sold: "Vendido",
  archived: "Arquivado",
};

export const MEMBER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  suspended: "Suspenso",
};

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  countered: "Contraproposta",
  accepted: "Aceita",
  rejected: "Recusada",
  expired: "Expirada",
  cancelled: "Cancelada",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  created: "Criado",
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  in_delivery: "Em entrega",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;
