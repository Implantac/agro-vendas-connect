/**
 * Características técnicas relevantes por categoria.
 *
 * Usado no cadastro e na edição do anúncio (o vendedor só vê o que faz sentido
 * para a categoria escolhida) e nos filtros do comprador (nenhum atributo
 * irrelevante aparece). As chaves são gravadas em technical_data_json.
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

const POTENCIA: SpecField = {
  key: "potencia",
  label: "Potência",
  placeholder: "Ex.: 150",
  numeric: true,
  unit: "cv",
};

const CABINE: SpecField = {
  key: "cabine",
  label: "Cabine",
  options: ["Com cabine", "Sem cabine", "Com ar-condicionado"],
};

const SPECS: Record<string, SpecField[]> = {
  tratores: [
    POTENCIA,
    { key: "tracao", label: "Tração", options: ["4x2", "4x4", "Esteira"] },
    CABINE,
    { key: "transmissao", label: "Transmissão", options: ["Mecânica", "Powershift", "CVT"] },
    { key: "pneus", label: "Estado dos pneus", options: ["Novos", "Bons", "A trocar"] },
    ...COMMON,
  ],
  colheitadeiras: [
    POTENCIA,
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
    CABINE,
    ...COMMON,
  ],
  "plantadeiras-semeadeiras": [
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
      key: "tipo_pulverizador",
      label: "Tipo",
      options: ["Autopropelido", "De arrasto", "Acoplado"],
    },
    POTENCIA,
    {
      key: "capacidade_tanque",
      label: "Capacidade do tanque",
      placeholder: "Ex.: 3000",
      numeric: true,
      unit: "L",
    },
    { key: "barras", label: "Largura das barras", placeholder: "Ex.: 30", numeric: true, unit: "m" },
    ...COMMON,
  ],
  "preparo-de-solo": [
    {
      key: "tipo_implemento",
      label: "Tipo de implemento",
      options: ["Grade", "Arado", "Subsolador", "Escarificador", "Niveladora", "Outro"],
    },
    { key: "largura_trabalho", label: "Largura de trabalho", placeholder: "Ex.: 3.5", unit: "m" },
    { key: "discos_hastes", label: "Nº de discos/hastes", placeholder: "Ex.: 20", numeric: true },
    {
      key: "engate",
      label: "Tipo de engate",
      options: ["3 pontos", "Arrasto", "Montado"],
    },
    {
      key: "potencia_exigida",
      label: "Potência exigida do trator",
      placeholder: "Ex.: 120",
      numeric: true,
      unit: "cv",
    },
    ...COMMON,
  ],
  "transporte-agricola": [
    {
      key: "tipo_transporte",
      label: "Tipo",
      options: ["Carreta agrícola", "Graneleira", "Caçamba", "Prancha", "Tanque", "Outro"],
    },
    {
      key: "capacidade_carga",
      label: "Capacidade de carga",
      placeholder: "Ex.: 15",
      numeric: true,
      unit: "t",
    },
    { key: "eixos", label: "Número de eixos", placeholder: "Ex.: 2", numeric: true },
    { key: "pneus", label: "Estado dos pneus", options: ["Novos", "Bons", "A trocar"] },
    ...COMMON,
  ],
  pecuaria: [
    {
      key: "tipo_equipamento",
      label: "Tipo de equipamento",
      options: [
        "Tronco de contenção",
        "Balança",
        "Misturador/vagão",
        "Ordenhadeira",
        "Cocho/comedouro",
        "Outro",
      ],
    },
    { key: "capacidade", label: "Capacidade", placeholder: "Ex.: 5000 kg" },
    {
      key: "acionamento",
      label: "Acionamento",
      options: ["Manual", "Elétrico", "Hidráulico", "Tomada de força"],
    },
    ...COMMON,
  ],
  "agricultura-de-precisao": [
    {
      key: "tipo_tecnologia",
      label: "Tipo de tecnologia",
      options: [
        "Piloto automático",
        "Monitor de plantio",
        "Antena/receptor GNSS",
        "Sensor de colheita",
        "Drone",
        "Outro",
      ],
    },
    { key: "marca_sistema", label: "Marca do sistema", placeholder: "Ex.: John Deere StarFire" },
    {
      key: "precisao",
      label: "Precisão do sinal",
      options: ["Submétrica", "Decimétrica", "Centimétrica (RTK)"],
    },
    { key: "assinatura", label: "Assinatura/licença ativa", options: ["Sim", "Não"] },
    ...COMMON,
  ],
};

/** Slugs antigos ou abreviados que ainda podem aparecer em dados existentes. */
const ALIASES: Record<string, string> = {
  plantadeiras: "plantadeiras-semeadeiras",
  semeadeiras: "plantadeiras-semeadeiras",
  solo: "preparo-de-solo",
  transporte: "transporte-agricola",
  tecnologia: "agricultura-de-precisao",
  "agricultura-precisao": "agricultura-de-precisao",
};

export const CATEGORY_SPEC_FIELDS = SPECS;

export const DEFAULT_SPEC_FIELDS: SpecField[] = COMMON;

export function specFieldsFor(categorySlug: string | null | undefined): SpecField[] {
  if (!categorySlug) return DEFAULT_SPEC_FIELDS;
  const slug = ALIASES[categorySlug] ?? categorySlug;
  return SPECS[slug] ?? DEFAULT_SPEC_FIELDS;
}

/** Rótulo legível de uma característica, independente da categoria. */
export function specLabel(key: string): string | null {
  for (const fields of Object.values(SPECS)) {
    const found = fields.find((f) => f.key === key);
    if (found) return found.unit ? `${found.label} (${found.unit})` : found.label;
  }
  return null;
}
