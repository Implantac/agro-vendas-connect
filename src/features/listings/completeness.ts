/**
 * Índice de completude do anúncio — regra única usada pela edição do vendedor
 * e pelo painel comercial. Cada item tem peso; o score é 0-100.
 */
export interface CompletenessInput {
  title?: string | null;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  manufacture_year?: number | null;
  hours_used?: number | null;
  price?: number | null;
  price_on_request?: boolean;
  city?: string | null;
  state?: string | null;
  category_id?: string | null;
  technical_data_json?: Record<string, unknown> | null;
  photos?: number;
}

export interface CompletenessItem {
  key: string;
  label: string;
  done: boolean;
  weight: number;
}

export function listingCompleteness(l: CompletenessInput) {
  const tech = l.technical_data_json ?? {};
  const has = (k: string) => String(tech[k] ?? "").trim().length > 0;
  const items: CompletenessItem[] = [
    { key: "photos3", label: "Pelo menos 3 fotos", done: (l.photos ?? 0) >= 3, weight: 20 },
    { key: "photo1", label: "Foto de capa", done: (l.photos ?? 0) >= 1, weight: 10 },
    { key: "title", label: "Título claro", done: (l.title ?? "").trim().length >= 12, weight: 6 },
    {
      key: "description",
      label: "Descrição com pelo menos 120 caracteres",
      done: (l.description ?? "").trim().length >= 120,
      weight: 10,
    },
    { key: "brand", label: "Marca", done: Boolean(l.brand?.trim()), weight: 6 },
    { key: "model", label: "Modelo", done: Boolean(l.model?.trim()), weight: 6 },
    { key: "year", label: "Ano de fabricação", done: Boolean(l.manufacture_year), weight: 6 },
    {
      key: "hours",
      label: "Horas de uso",
      done: l.hours_used !== null && l.hours_used !== undefined,
      weight: 6,
    },
    {
      key: "price",
      label: "Preço (ou sob consulta)",
      done: Boolean(l.price) || Boolean(l.price_on_request),
      weight: 8,
    },
    { key: "location", label: "Cidade e UF", done: Boolean(l.city && l.state), weight: 6 },
    { key: "category", label: "Categoria", done: Boolean(l.category_id), weight: 4 },
    {
      key: "power",
      label: "Potência (cv)",
      done: has("potencia") || has("potencia_cv") || has("Potência"),
      weight: 4,
    },
    {
      key: "owners",
      label: "Número de proprietários",
      done: has("proprietarios") || has("Proprietários"),
      weight: 4,
    },
    {
      key: "docs",
      label: "Documentação informada",
      done: has("documentacao") || has("Documentação"),
      weight: 4,
    },
  ];
  const total = items.reduce((s, i) => s + i.weight, 0);
  const got = items.filter((i) => i.done).reduce((s, i) => s + i.weight, 0);
  return { score: Math.round((got / total) * 100), items, missing: items.filter((i) => !i.done) };
}

/** Ordem e rótulos padrão da ficha técnica exibida ao comprador. */
export const TECH_SPEC_ORDER: { key: string; label: string }[] = [
  { key: "potencia", label: "Potência" },
  { key: "transmissao", label: "Transmissão" },
  { key: "tracao", label: "Tração" },
  { key: "pneus", label: "Pneus" },
  { key: "cabine", label: "Cabine" },
  { key: "motor", label: "Motor" },
  { key: "conservacao", label: "Estado de conservação" },
  { key: "proprietarios", label: "Nº de proprietários" },
  { key: "documentacao", label: "Documentação" },
];

export function orderedSpecs(tech: Record<string, unknown> | null | undefined) {
  const entries = Object.entries(tech ?? {}).filter(([, v]) => String(v ?? "").trim() !== "");
  const known = new Map(TECH_SPEC_ORDER.map((s, i) => [s.key, i]));
  return entries
    .map(([k, v]) => ({
      key: k,
      label: TECH_SPEC_ORDER.find((s) => s.key === k)?.label ?? k,
      value: String(v),
      order: known.get(k) ?? 999,
    }))
    .sort((a, b) => a.order - b.order);
}

/** Código curto e legível do anúncio (derivado do id). */
export function listingCode(id: string) {
  return `DDP-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
