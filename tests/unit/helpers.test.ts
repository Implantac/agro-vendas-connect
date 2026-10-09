import { describe, expect, test } from "bun:test";
import { csvCell } from "../../src/lib/csv";
import { sanitizeSearchTerm } from "../../src/lib/search-term";

describe("sanitizeSearchTerm", () => {
  test("remove caracteres que quebram o filtro or do PostgREST", () => {
    expect(sanitizeSearchTerm("trator, john(deere)")).toBe("trator john deere");
    expect(sanitizeSearchTerm('a"b\\c')).toBe("a b c");
  });
  test("neutraliza curingas do ilike", () => {
    expect(sanitizeSearchTerm("%_*")).toBe("");
    expect(sanitizeSearchTerm("50% off")).toBe("50 off");
  });
  test("normaliza espaços e limita o tamanho", () => {
    expect(sanitizeSearchTerm("   colhedora    jd  ")).toBe("colhedora jd");
    expect(sanitizeSearchTerm("x".repeat(200))).toHaveLength(80);
  });
});

describe("csvCell", () => {
  test("valores simples passam sem alteração", () => {
    expect(csvCell("Plantadeira")).toBe("Plantadeira");
    expect(csvCell("")).toBe("");
  });
  test("separador, aspas e quebras de linha exigem aspas e preservam o conteúdo", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell("linha1\nlinha2")).toBe('"linha1\nlinha2"');
  });
  test("neutraliza fórmulas (CSV injection)", () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell("+1+1")).toBe("'+1+1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
});
