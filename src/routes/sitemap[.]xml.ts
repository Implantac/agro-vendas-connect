import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const urls = PATHS.map(
          (p) =>
            `<url><loc>${origin}${p}</loc><changefreq>weekly</changefreq><priority>${p === "/" ? "1.0" : "0.7"}</priority></url>`,
        ).join("");
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
          { headers: { "Content-Type": "application/xml; charset=utf-8" } },
        );
      },
    },
  },
});
