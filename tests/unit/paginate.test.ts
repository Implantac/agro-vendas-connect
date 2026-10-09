import { describe, expect, test } from "bun:test";
import { fetchAllRows, storagePathFromUrl } from "../../src/lib/paginate";

describe("fetchAllRows", () => {
  test("lê todas as páginas até a última parcial", async () => {
    const total = 2500;
    const rows = Array.from({ length: total }, (_, i) => i);
    const calls: [number, number][] = [];
    const out = await fetchAllRows<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    }, 5000);
    expect(out.length).toBe(total);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  test("respeita o teto e não ultrapassa maxRows", async () => {
    const out = await fetchAllRows<number>(
      async (from, to) => ({
        data: Array.from({ length: to - from + 1 }, (_, i) => from + i),
        error: null,
      }),
      1500,
    );
    expect(out.length).toBe(1500);
  });

  test("propaga erro do banco em vez de devolver lista parcial", async () => {
    await expect(
      fetchAllRows<number>(async () => ({ data: null, error: new Error("falhou") })),
    ).rejects.toThrow("falhou");
  });
});

describe("storagePathFromUrl", () => {
  test("extrai o caminho de URL assinada", () => {
    const url =
      "https://x.supabase.co/storage/v1/object/sign/listing-photos/uid-1/anuncio-2/foto%20a.jpg?token=abc";
    expect(storagePathFromUrl(url, "listing-photos")).toBe("uid-1/anuncio-2/foto a.jpg");
  });

  test("extrai o caminho de URL pública", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/listing-photos/uid/a/b.png";
    expect(storagePathFromUrl(url, "listing-photos")).toBe("uid/a/b.png");
  });

  test("ignora URL de outro bucket ou sem caminho", () => {
    expect(storagePathFromUrl("https://exemplo.invalid/foto.jpg", "listing-photos")).toBeNull();
    expect(
      storagePathFromUrl("https://x/storage/v1/object/public/seller-logos/a.png", "listing-photos"),
    ).toBeNull();
  });
});
