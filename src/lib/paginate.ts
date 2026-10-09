/**
 * Leitura paginada. O PostgREST devolve no máximo 1000 linhas por requisição,
 * e um corte silencioso faz a tela mostrar dados incompletos. Este helper lê
 * em blocos de PAGE_SIZE até acabar ou até maxRows, e avisa quando corta.
 * `run` deve aplicar ordenação estável (com desempate por id).
 */
export const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  maxRows = 2000,
  label = "consulta",
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < maxRows; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, maxRows) - 1;
    const { data, error } = await run(from, to);
    if (error) throw error;
    const page = data ?? [];
    out.push(...page);
    if (page.length < to - from + 1) return out;
  }
  console.warn(`${label}: resultado limitado aos primeiros ${maxRows} registros.`);
  return out;
}

/**
 * Extrai o caminho do objeto no bucket a partir de uma URL de foto
 * (assinada ou pública). Retorna null se a URL não for do bucket informado.
 */
export function storagePathFromUrl(url: string, bucket: string): string | null {
  const re = new RegExp(`/object/(?:sign|public)/${bucket}/([^?#]+)`);
  const m = re.exec(url);
  if (!m || !m[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}
