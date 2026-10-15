import { describe, expect, test } from "bun:test";
import {
  BR_UFS,
  categoryPageTitle,
  listingPageDescription,
  normalizeUf,
  regionPageTitle,
  shouldIndexListingPage,
  ufName,
} from "../../src/lib/regions";

describe("BR_UFS", () => {
  test("lista as 27 unidades federativas, sem repetição", () => {
    expect(BR_UFS.length).toBe(27);
    expect(new Set(BR_UFS.map((x) => x.uf)).size).toBe(27);
  });
});

describe("normalizeUf", () => {
  test("aceita UF em minúsculas e com espaços, devolvendo maiúsculas", () => {
    expect(normalizeUf("mt")).toBe("MT");
    expect(normalizeUf("  sp ")).toBe("SP");
  });

  test("rejeita valores que não são UF", () => {
    expect(normalizeUf("XX")).toBeNull();
    expect(normalizeUf("Mato Grosso")).toBeNull();
    expect(normalizeUf("")).toBeNull();
    expect(normalizeUf(null)).toBeNull();
    expect(normalizeUf(undefined)).toBeNull();
  });
});

describe("ufName", () => {
  test("devolve o nome do estado", () => {
    expect(ufName("MT")).toBe("Mato Grosso");
    expect(ufName("mg")).toBe("Minas Gerais");
  });

  test("devolve null para UF inexistente", () => {
    expect(ufName("ZZ")).toBeNull();
  });
});

describe("títulos das páginas", () => {
  test("categoria", () => {
    expect(categoryPageTitle("Colheitadeiras")).toBe("Colheitadeiras à venda | DDP AGRO");
  });

  test("estado", () => {
    expect(regionPageTitle("Mato Grosso", "MT")).toBe(
      "Implementos agrícolas à venda em Mato Grosso (MT) | DDP AGRO",
    );
  });
});

describe("listingPageDescription", () => {
  test("usa o singular para um anúncio", () => {
    expect(listingPageDescription("Intro.", 1)).toContain("1 anúncio aprovado,");
  });

  test("usa o plural para vários anúncios", () => {
    expect(listingPageDescription("Intro.", 7)).toContain("7 anúncios aprovados,");
  });

  test("sem anúncios, não promete contagem", () => {
    const text = listingPageDescription("Intro.", 0);
    expect(text).not.toContain("anúncio");
    expect(text).toContain("catálogo verificado");
  });

  test("nunca passa de 160 caracteres", () => {
    expect(listingPageDescription("x".repeat(300), 12).length).toBeLessThanOrEqual(160);
  });
});

describe("shouldIndexListingPage", () => {
  test("indexa quando existe e tem anúncios", () => {
    expect(shouldIndexListingPage({ exists: true, count: 3, failed: false })).toBe(true);
  });

  test("não indexa página vazia (thin content)", () => {
    expect(shouldIndexListingPage({ exists: true, count: 0, failed: false })).toBe(false);
  });

  test("não indexa categoria ou estado inexistente", () => {
    expect(shouldIndexListingPage({ exists: false, count: 0, failed: false })).toBe(false);
  });

  test("falha de consulta não gera noindex", () => {
    expect(shouldIndexListingPage({ exists: false, count: 0, failed: true })).toBe(true);
  });
});
