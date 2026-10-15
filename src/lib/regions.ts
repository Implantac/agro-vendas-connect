/**
 * Páginas públicas de categoria e de estado (indexáveis). Funções puras: sem I/O,
 * para serem testadas em unidade e reutilizadas pela rota e pelo sitemap.
 */

export const BR_UFS = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
] as const;

const UF_NAME = new Map<string, string>(BR_UFS.map((x) => [x.uf, x.name]));

/** Devolve a UF em maiúsculas se for uma UF brasileira válida; senão, null. */
export function normalizeUf(value: string | null | undefined): string | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  return UF_NAME.has(upper) ? upper : null;
}

/** Nome do estado para a UF; null se a UF não existir. */
export function ufName(uf: string): string | null {
  return UF_NAME.get(uf.toUpperCase()) ?? null;
}

/** Título da página de categoria. */
export function categoryPageTitle(categoryName: string): string {
  return `${categoryName} à venda | DDP AGRO`;
}

/** Título da página de estado. */
export function regionPageTitle(stateName: string, uf: string): string {
  return `Implementos agrícolas à venda em ${stateName} (${uf}) | DDP AGRO`;
}

/** Descrição (até 160 caracteres) de uma página de listagem. */
export function listingPageDescription(intro: string, count: number): string {
  if (count === 0) return `${intro} Veja o catálogo verificado do DDP AGRO.`.slice(0, 160);
  const n = count === 1 ? "1 anúncio aprovado" : `${count} anúncios aprovados`;
  return `${intro} ${n}, com ficha técnica e vendedor verificado no DDP AGRO.`.slice(0, 160);
}

/**
 * Indexar só quando há conteúdo: página vazia vira "thin content" e não deve entrar no
 * índice. Falha de consulta não gera noindex (mesmo critério do anúncio).
 */
export function shouldIndexListingPage(opts: {
  exists: boolean;
  count: number;
  failed: boolean;
}): boolean {
  if (opts.failed) return true;
  return opts.exists && opts.count > 0;
}
