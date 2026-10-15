import { createFileRoute, redirect } from "@tanstack/react-router";

import { CatalogLanding } from "@/components/catalog/CatalogLanding";
import { fetchApprovedListings, fetchCategories } from "@/lib/queries";
import {
  listingPageDescription,
  normalizeUf,
  regionPageTitle,
  shouldIndexListingPage,
  ufName,
} from "@/lib/regions";

/**
 * Página pública de estado (ex.: /implementos/uf/MT). UF em minúsculas redireciona para a
 * forma canônica em maiúsculas, para não duplicar a mesma página.
 */
export const Route = createFileRoute("/implementos/uf/$uf")({
  loader: async ({ params }) => {
    const uf = normalizeUf(params.uf);
    if (!uf) return { uf: null, stateName: null, categories: [], listings: [], failed: false };
    if (uf !== params.uf) throw redirect({ to: "/implementos/uf/$uf", params: { uf } });
    try {
      const [categories, listings] = await Promise.all([
        fetchCategories(),
        fetchApprovedListings({ state: uf }),
      ]);
      return { uf, stateName: ufName(uf), categories, listings, failed: false };
    } catch (err) {
      console.warn("[uf] falha ao carregar a página no servidor", err);
      return { uf: null, stateName: null, categories: [], listings: [], failed: true };
    }
  },
  head: ({ loaderData }) => {
    const uf = loaderData?.uf ?? null;
    const stateName = loaderData?.stateName ?? null;
    const failed = loaderData?.failed ?? false;
    const count = loaderData?.listings.length ?? 0;
    const title =
      uf && stateName ? regionPageTitle(stateName, uf) : "Implementos por estado | DDP AGRO";
    const description =
      uf && stateName
        ? listingPageDescription(`Implementos agrícolas à venda em ${stateName}.`, count)
        : "Implementos agrícolas usados por estado no DDP AGRO.";
    const index = failed || shouldIndexListingPage({ exists: uf !== null, count, failed: false });
    return {
      meta: [
        { title },
        ...(index ? [] : [{ name: "robots", content: "noindex" }]),
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: RegionPage,
});

function RegionPage() {
  const { uf, stateName, categories, listings, failed } = Route.useLoaderData();
  const categoryLinks = categories.map((c) => ({ slug: c.slug, label: c.name }));

  if (failed) {
    return (
      <CatalogLanding
        eyebrow="Estado"
        title="Catálogo indisponível"
        intro="Não foi possível carregar os anúncios deste estado agora. Tente novamente em instantes."
        listings={[]}
        catalogSearch={{}}
        related={[]}
        relatedTitle=""
      />
    );
  }

  if (!uf || !stateName) {
    return (
      <CatalogLanding
        eyebrow="Estado"
        title="Estado não encontrado"
        intro="Informe a sigla de um estado brasileiro (ex.: SP, MT, GO). Veja os anúncios no catálogo."
        listings={[]}
        catalogSearch={{}}
        related={categoryLinks}
        relatedTitle="Categorias"
      />
    );
  }

  return (
    <CatalogLanding
      eyebrow="Estado"
      title={`${stateName} (${uf})`}
      intro={`Implementos agrícolas usados e seminovos anunciados em ${stateName}.`}
      listings={listings}
      catalogSearch={{ uf }}
      related={categoryLinks}
      relatedTitle="Categorias em todo o catálogo"
    />
  );
}
