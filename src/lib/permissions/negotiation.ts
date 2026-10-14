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

export type Side = "buyer" | "seller";

/**
 * Quem deve responder agora (espelha respond_proposal, migration 20261014120000).
 * - open: vez do vendedor.
 * - countered: vez de quem NÃO fez a última contraproposta.
 * Sem a última contraproposta conhecida, a vez é indefinida (null).
 */
export function turnOf(status: string, lastCounterBy?: Side | null): Side | null {
  if (status === "open") return "seller";
  if (status === "countered") {
    if (!lastCounterBy) return null;
    return lastCounterBy === "seller" ? "buyer" : "seller";
  }
  return null;
}

/**
 * Ações permitidas para o usuário na proposta atual.
 * - aceitar, recusar e contrapor: só quem tem a vez.
 * - cancelar: só o comprador, a qualquer momento enquanto aberta (regra do banco).
 */
export function allowedActions(
  status: string,
  expiresAt: string | null | undefined,
  p: Party,
  lastCounterBy?: Side | null,
) {
  const role = roleIn(p);
  if (!role || !isOpen(status) || isExpired(expiresAt)) return [] as const;
  const myTurn = turnOf(status, lastCounterBy) === role;
  const actions: ("accepted" | "rejected" | "countered" | "cancelled")[] = [];
  if (myTurn) actions.push("accepted", "rejected", "countered");
  if (role === "buyer") actions.push("cancelled");
  return actions;
}

/** Quem fez a última contraproposta, a partir do histórico (ordem cronológica). */
export function lastCounterFrom(
  events: { event_type: string; actor_id: string | null }[],
  p: Party,
): Side | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (!ev || ev.event_type !== "countered") continue;
    if (ev.actor_id === p.sellerId) return "seller";
    if (ev.actor_id === p.buyerId) return "buyer";
    return null;
  }
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
