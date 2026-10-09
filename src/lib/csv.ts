/**
 * Escapa uma célula CSV: aspas duplicadas, campo entre aspas quando necessário e neutraliza
 * fórmulas (=, +, -, @, tab, CR) para não executarem no Excel/Sheets (CSV injection).
 */
export function csvCell(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
  const needsQuotes = /[";\r\n]/.test(v);
  return needsQuotes ? `"${v.replace(/"/g, '""')}"` : v;
}
