/**
 * Características técnicas relevantes por categoria.
 *
 * Usado no cadastro do anúncio (o vendedor só vê o que faz sentido para a
 * categoria escolhida) e nos filtros do comprador (nenhum atributo irrelevante
 * aparece). As chaves são gravadas em technical_data_json.
 */
export interface SpecField {
  key: string;
  label: string;
  placeholder?: string;
  /** Opções fechadas; quando ausente, o campo é texto livre. */
  options?: string[];
  /** Campo numérico — habilita filtro "a partir de / até". */
  numeric?: boolean;
  unit?: string;
}

const COMMON: SpecField[] = [
  { key: "conservacao", label: "Estado de conservação", options: ["Ótimo", "Bom", "Regular"] },
  { key: "proprietarios", label: "Nº de proprietários", placeholder: "Ex.: 1", numeric: true },
  {
    key: "documentacao",
    label: "Documentação",
    options: ["Em dia", "Pendente", "Não se aplica"],
  },
];

export const CATEGORY_SPEC_FIELDS: Record<string, SpecField[]> = {
  tratores: [
    { key: "potencia", label: "Potência", placeholder: "Ex.: 150", numeric: true, unit: "cv" },
    { key: "tracao", label: "Tração", options: ["4x2", "4x4", "Esteira"] },
    { key: "cabine", label: "Cabine", options: ["Com cabine", "Sem cabine", "Com ar-condicionado"] },
    { key: "transmissao", label: "Transmissão", options: ["Mecânica", "Powershift", "CVT"] },
    { key: "pneus", label: "Estado dos pneus", options: ["Novos", "Bons", "A trocar"] },
    ...COMMON,
  ],
  colheitadeiras: [
    {
      key: "plataforma",
      label: "Plataforma (pés)",
      placeholder: "Ex.: 25",
      numeric: true,
      unit: "pés",
    },
    {
      key: "capacidade_tanque",
      label: "Capacidade do tanque graneleiro",
      placeholder: "Ex.: 10500",
      numeric: true,
      unit: "L",
    },
    { key: "sistema_trilha", label: "Sistema de trilha", options: ["Axial", "Radial", "Híbrido"] },
    { key: "cabine", label: "Cabine", options: ["Com cabine", "Sem cabine", "Com ar-condicionado"] },
    ...COMMON,
  ],
  plantadeiras: [
    { key: "linhas", label: "Número de linhas", placeholder: "Ex.: 17", numeric: true },
    {
      key: "espacamento",
      label: "Espaçamento entre linhas",
      placeholder: "Ex.: 45",
      numeric: true,
      unit: "cm",
    },
    { key: "fertilizante", label: "Distribuição de fertilizante", options: ["Sim", "Não"] },
    { key: "sistema_plantio", label: "Sistema de plantio", options: ["Pneumático", "Mecânico"] },
    ...COMMON,
  ],
  pulverizadores: [
    {
      key: "capacidade_tanque",
      label: "Capacidade do tanque",
      placeholder: "Ex.: 3000",
      numeric: true,
      unit: "L",
    },
    { key: "barras", label: "Largura das barras", placeholder: "Ex.: 30", numeric: true, unit: "m" },
    { key: "tipo_pulverizador", label: "Tipo", options: ["Autopropelido", "De arrasto", "Acoplado"] },
    ...COMMON,
  ],
};

export const DEFAULT_SPEC_FIELDS: SpecField[] = COMMON;

export function specFieldsFor(categorySlug: string | null | undefined): SpecField[] {
  if (!categorySlug) return DEFAULT_SPEC_FIELDS;
  return CATEGORY_SPEC_FIELDS[categorySlug] ?? DEFAULT_SPEC_FIELDS;
}
