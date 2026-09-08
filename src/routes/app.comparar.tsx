import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Scale, X } from "lucide-react";
import { AppPage } from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { fetchListingsByIds } from "@/features/listings/queries";
import { orderedSpecs } from "@/features/listings/completeness";
import { CONDITION_LABELS, formatBRL } from "@/lib/format";

type Search = { ids?: string | undefined };

export const Route = createFileRoute("/app/comparar")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ids: typeof s["ids"] === "string" ? s["ids"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Comparar máquinas | DDP AGRO" },
      { name: "description", content: "Compare até 3 máquinas lado a lado." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Comparar,
});

function Comparar() {
  const { ids: raw } = Route.useSearch();
  const navigate = useNavigate();
  const ids = (raw ?? "").split(",").filter(Boolean).slice(0, 3);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["compare", ids.join(",")],
    queryFn: () => fetchListingsByIds(ids),
    enabled: ids.length > 0,
  });

  function remove(id: string) {
    const next = ids.filter((x) => x !== id);
    void navigate({
      to: "/app/comparar",
      search: next.length ? { ids: next.join(",") } : {},
      replace: true,
    });
  }

  const rows: { label: string; render: (l: (typeof items)[number]) => string }[] = [
    {
      label: "Preço",
      render: (l) => (l.price_on_request ? "Sob consulta" : formatBRL(l.price)),
    },
    { label: "Marca / modelo", render: (l) => [l.brand, l.model].filter(Boolean).join(" ") || "—" },
    { label: "Categoria", render: (l) => l.categories?.name ?? "—" },
    { label: "Ano", render: (l) => (l.manufacture_year ? String(l.manufacture_year) : "—") },
    {
      label: "Horas de uso",
      render: (l) => (l.hours_used != null ? `${l.hours_used.toLocaleString("pt-BR")} h` : "—"),
    },
    { label: "Condição", render: (l) => CONDITION_LABELS[l.condition] ?? l.condition },
    { label: "Localização", render: (l) => (l.city ? `${l.city}/${l.state}` : "—") },
  ];

  const specKeys = [
    ...new Set(
      items.flatMap((l) =>
        orderedSpecs(l.technical_data_json as Record<string, unknown>).map((s) => s.key),
      ),
    ),
  ];

  return (
    <AppPage>
      <Link
        to="/app/favoritos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-forest"
      >
        <ArrowLeft className="h-4 w-4" /> Minhas máquinas
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-forest sm:text-3xl">
        Comparar máquinas
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Até 3 máquinas lado a lado. Selecione-as em Minhas máquinas.
      </p>

      {ids.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
          <Scale className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 font-display text-lg font-semibold text-forest">
            Nenhuma máquina selecionada
          </h2>
          <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/app/favoritos">Escolher em Minhas máquinas</Link>
          </Button>
        </div>
      ) : isLoading ? (
        <div className="mt-8 h-96 animate-pulse rounded-lg bg-secondary/60" />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border align-top">
                <th className="w-40 p-3 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  Máquina
                </th>
                {items.map((l) => {
                  const media = (l.listing_media ?? [])
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order);
                  const cover = media.find((m) => m.is_cover)?.url ?? media[0]?.url;
                  return (
                    <th key={l.id} className="p-3 text-left font-normal">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => remove(l.id)}
                          aria-label="Remover da comparação"
                          className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-forest"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        {cover ? (
                          <img
                            src={cover}
                            alt={l.title}
                            className="aspect-4/3 w-full rounded-sm object-cover"
                          />
                        ) : (
                          <div className="aspect-4/3 w-full rounded-sm bg-secondary" />
                        )}
                      </div>
                      <Link
                        to="/implementos/$slug"
                        params={{ slug: l.slug }}
                        className="mt-2 block font-display text-sm font-semibold text-forest hover:underline"
                      >
                        {l.title}
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border last:border-0">
                  <th className="p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {r.label}
                  </th>
                  {items.map((l) => (
                    <td key={l.id} className="p-3 font-medium text-forest">
                      {r.render(l)}
                    </td>
                  ))}
                </tr>
              ))}
              {specKeys.map((k) => (
                <tr key={k} className="border-b border-border last:border-0">
                  <th className="p-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {orderedSpecs({ [k]: "x" })[0]?.label ?? k}
                  </th>
                  {items.map((l) => (
                    <td key={l.id} className="p-3 text-foreground">
                      {String((l.technical_data_json as Record<string, unknown>)?.[k] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppPage>
  );
}
