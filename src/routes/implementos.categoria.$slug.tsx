import { createFileRoute } from "@tanstack/react-router";

import { CatalogLanding } from "@/components/catalog/CatalogLanding";
import { fetchApprovedListings, fetchCategories } from "@/lib/queries";
import { categoryPageTitle, listingPageDescription, shouldIndexListingPage } from "@/lib/regions";

/**
 * Página pública de categoria (ex.: /implementos/categoria/colheitadeiras).
 * Carrega no servidor para que o buscador receba os anúncios no HTML.
 */
export const Route = createFileRoute("/implementos/categoria/$slug")({
  loader: async ({ params }) => {
    try {
      const categories = await fetchCategories();
      const category = categories.find((c) => c.slug === params.slug) ?? null;
      if (!category) return { category: null, categories, listings: [], failed: false };
      const listings = await fetchApprovedListings({ category: category.slug });
      return { category, categories, listings, failed: false };
    } catch (err) {
      console.warn("[categoria] falha ao carregar a página no servidor", err);
      return { category: null, categories: [], listings: [], failed: true };
    }
  },
  head: ({ loaderData }) => {
    const category = loaderData?.category ?? null;
    const failed = loaderData?.failed ?? false;
    const count = loaderData?.listings.length ?? 0;
    const title = category
      ? categoryPageTitle(category.name)
      : "Categoria de implementos | DDP AGRO";
    const description = category
      ? listingPageDescription(`${category.name} usados e seminovos à venda no DDP AGRO.`, count)
      : "Categoria de implementos agrícolas no DDP AGRO.";
    // Falha de consulta não vira noindex (não sabemos se há conteúdo). Categoria inexistente
    // ou vazia fica fora do índice.
    const index =
      failed || shouldIndexListingPage({ exists: category !== null, count, failed: false });
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
  component: CategoryPage,
});

function CategoryPage() {
  const { category, categories, listings, failed } = Route.useLoaderData();

  if (failed) {
    return (
      <CatalogLanding
        eyebrow="Categoria"
        title="Catálogo indisponível"
        intro="Não foi possível carregar esta categoria agora. Tente novamente em instantes."
        listings={[]}
        catalogSearch={{}}
        related={[]}
        relatedTitle=""
      />
    );
  }

  if (!category) {
    return (
      <CatalogLanding
        eyebrow="Categoria"
        title="Categoria não encontrada"
        intro="Esta categoria não existe ou está inativa. Veja as categorias disponíveis no catálogo."
        listings={[]}
        catalogSearch={{}}
        related={categories.map((c) => ({ slug: c.slug, label: c.name }))}
        relatedTitle="Categorias"
      />
    );
  }

  return (
    <CatalogLanding
      eyebrow="Categoria"
      title={category.name}
      intro={`${category.name} usados e seminovos, com ficha técnica e vendedor verificado.`}
      listings={listings}
      catalogSearch={{ categoria: category.slug }}
      related={categories
        .filter((c) => c.slug !== category.slug)
        .map((c) => ({ slug: c.slug, label: c.name }))}
      relatedTitle="Outras categorias"
    />
  );
}
