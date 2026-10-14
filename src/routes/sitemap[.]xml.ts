import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const PATHS = [
  "/",
  "/catalogo",
  "/planos",
  "/como-funciona",
  "/seguranca",
  "/central-de-ajuda",
  "/contato",
  "/entrar",
  "/cadastro",
  "/termos-de-uso",
  "/politica-de-privacidade",
  "/politica-de-cookies",
  "/termo-de-aceite",
];

// Limite do protocolo sitemaps.org: 50 mil URLs por arquivo.
const MAX_LISTINGS = 5000;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Anúncios aprovados (lidos com a chave pública; a RLS só expõe aprovados a anônimo).
 * Se a consulta falhar, o sitemap sai só com as páginas fixas, sem quebrar.
 */
async function approvedListingUrls(): Promise<{ slug: string; lastmod: string | null }[]> {
  try {
    const { data, error } = await supabase
      .from("listings")
      .select("slug,published_at,updated_at")
      .eq("status", "approved")
      .order("published_at", { ascending: false })
      .limit(MAX_LISTINGS);
    if (error || !data) return [];
    return data.map((row) => ({
      slug: row.slug,
      lastmod: (row.updated_at ?? row.published_at ?? null)?.slice(0, 10) ?? null,
    }));
  } catch (err) {
    console.warn("[sitemap] falha ao listar anúncios", err);
    return [];
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const staticUrls = PATHS.map(
          (p) =>
            `<url><loc>${escapeXml(origin + p)}</loc><changefreq>weekly</changefreq><priority>${p === "/" ? "1.0" : "0.7"}</priority></url>`,
        );
        const listings = await approvedListingUrls();
        const listingUrls = listings.map(
          ({ slug, lastmod }) =>
            `<url><loc>${escapeXml(`${origin}/implementos/${slug}`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>daily</changefreq><priority>0.8</priority></url>`,
        );
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticUrls, ...listingUrls].join("")}</urlset>`,
          { headers: { "Content-Type": "application/xml; charset=utf-8" } },
        );
      },
    },
  },
});
