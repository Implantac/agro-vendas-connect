/**
 * Regras de negociação centralizadas (espelham a RPC respond_proposal).
 * O frontend usa isto só para UX; o banco é a barreira real.
 */
export type ProposalStatus =
  "open" | "countered" | "accepted" | "rejected" | "expired" | "cancelled";

export const OPEN_STATUSES: ProposalStatus[] = ["open", "countered"];

export function isOpen(status: string) {
  return OPEN_STATUSES.includes(status as ProposalStatus);
}

export function isExpired(expiresAt: string | null | undefined) {
  return Boolean(expiresAt) && new Date(expiresAt!).getTime() < Date.now();
}

export interface Party {
  userId: string;
  buyerId: string;
  sellerId: string;
}

export function roleIn(p: Party): "buyer" | "seller" | null {
  if (p.userId === p.buyerId) return "buyer";
  if (p.userId === p.sellerId) return "seller";
  return null;
}

/** Ações permitidas para o usuário na proposta atual. */
export function allowedActions(status: string, expiresAt: string | null | undefined, p: Party) {
  const role = roleIn(p);
  if (!role || !isOpen(status) || isExpired(expiresAt)) return [] as const;
  const base = ["accepted", "rejected", "countered"] as const;
  return role === "buyer" ? ([...base, "cancelled"] as const) : base;
}

/** Quem deve agir agora (proposta aberta => vendedor; contraproposta => comprador). */
export function turnOf(status: string): "buyer" | "seller" | null {
  if (status === "open") return "seller";
  if (status === "countered") return "buyer";
  return null;
}

export function hoursLeft(expiresAt: string | null | undefined) {
  if (!expiresAt) return null;
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 36e5));
}

/** Condições comerciais estruturadas (proposals.terms_json). */
export interface CommercialTerms {
  pagamento?: string;
  prazo?: string;
  transporte?: string;
  entrega?: string;
  documentacao?: string;
  observacoes?: string;
}

export const TERM_FIELDS: { key: keyof CommercialTerms; label: string; placeholder: string }[] = [
  {
    key: "pagamento",
    label: "Forma de pagamento",
    placeholder: "Ex.: 50% sinal + 50% na retirada",
  },
  { key: "prazo", label: "Prazo", placeholder: "Ex.: até 15 dias após aceite" },
  { key: "transporte", label: "Transporte", placeholder: "Ex.: por conta do comprador" },
  {
    key: "entrega",
    label: "Entrega / retirada",
    placeholder: "Ex.: retirada na fazenda, Apucarana/PR",
  },
  { key: "documentacao", label: "Documentação", placeholder: "Ex.: nota fiscal de venda + recibo" },
  {
    key: "observacoes",
    label: "Observações",
    placeholder: "Vistoria prévia, garantia, acessórios...",
  },
];

export function termsFilled(t: CommercialTerms | null | undefined) {
  return TERM_FIELDS.filter((f) => String(t?.[f.key] ?? "").trim()).length;
}
