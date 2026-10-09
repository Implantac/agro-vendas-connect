import { describe, expect, test } from "bun:test";
import { formatRelativeBR } from "../../src/lib/format";

describe("formatRelativeBR", () => {
  const now = new Date("2026-10-09T15:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  test("agora para menos de 1 minuto", () => {
    expect(formatRelativeBR(ago(20_000), now)).toBe("agora");
  });

  test("minutos e horas", () => {
    expect(formatRelativeBR(ago(5 * 60_000), now)).toBe("há 5 min");
    expect(formatRelativeBR(ago(2 * 3_600_000), now)).toBe("há 2 h");
  });

  test("ontem para um dia", () => {
    expect(formatRelativeBR(ago(26 * 3_600_000), now)).toBe("ontem");
  });

  test("data para intervalos maiores", () => {
    const out = formatRelativeBR(ago(5 * 86_400_000), now);
    expect(out).toMatch(/\d/);
    expect(out.startsWith("há")).toBe(false);
  });

  test("vazio e inválido devolvem string vazia", () => {
    expect(formatRelativeBR(null, now)).toBe("");
    expect(formatRelativeBR("não é data", now)).toBe("");
  });
});
