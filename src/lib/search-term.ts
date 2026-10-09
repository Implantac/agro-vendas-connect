/**
 * Limpa o termo de busca antes de montá-lo num filtro `or` do PostgREST.
 * Vírgulas, parênteses, aspas e curingas quebram a sintaxe do filtro ou mudam o resultado.
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[%_*,()"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}
