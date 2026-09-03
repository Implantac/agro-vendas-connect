import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ShieldCheck, Calendar, Clock, Gauge, Building2, Lock, ImageOff } from "lucide-react";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { CONDITION_LABELS, formatBRL, formatDateBR } from "@/lib/format";
import { fetchListingBySlug } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { ProposalDialog } from "@/components/catalog/ProposalDialog";

export const Route = createFileRoute("/implementos/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Implemento agrícola ${params.slug} | DDP AGRO` },
      {
        name: "description",
        content:
          "Ficha técnica completa, condição, localização e envio de proposta registrada para este implemento agrícola.",
      },
      { property: "og:title", content: "Implemento agrícola | DDP AGRO" },
      {
        property: "og:description",
        content: "Ficha técnica, condição e proposta registrada no DDP AGRO.",
      },
    ],
  }),
  component: ListingDetail,
});

function ListingDetail() {
  const { slug } = Route.useParams();
  const { user, profile, loading: authLoading } = useAuth();
  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", slug],
    queryFn: () => fetchListingBySlug(slug),
  });

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <p className="text-sm text-muted-foreground">Carregando implemento...</p>
        </div>
      </PublicLayout>
    );
  }

  if (!user) {
    return <Navigate to="/entrar" search={{ redirect: `/implementos/${slug}` }} replace />;
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <p className="text-sm text-muted-foreground">Carregando implemento...</p>
        </div>
      </PublicLayout>
    );
  }

  if (!listing) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-forest">Anúncio não encontrado</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Este implemento pode ter sido vendido ou removido do catálogo.
          </p>
          <Button asChild className="mt-6">
            <Link to="/catalogo">Voltar ao catálogo</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  if (profile?.status !== "approved") {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Lock className="h-6 w-6 text-forest" />
          </div>
          <h1 className="font-display text-2xl font-bold text-forest">Cadastro em análise</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Assim que sua adesão for aprovada você poderá ver os detalhes deste implemento e
            negociar com o vendedor.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="ghost">
              <Link to="/catalogo">Voltar ao catálogo</Link>
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }



  const l = listing as unknown as {
    id: string;
    title: string;
    description: string;
    brand: string | null;
    model: string | null;
    manufacture_year: number | null;
    condition: string;
    hours_used: number | null;
    price: number | null;
    price_on_request: boolean;
    city: string | null;
    state: string | null;
    seller_id: string;
    published_at: string | null;
    technical_data_json: Record<string, string>;
    categories?: { name: string; slug: string } | null;
    listing_media?: { url: string; is_cover: boolean; sort_order: number }[];
    seller_profiles?: { trade_name: string; company_description: string | null; verification_status: string; logo_url?: string | null } | null;
  };

  const media = (l.listing_media ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const cover = media.find((m) => m.is_cover)?.url ?? media[0]?.url ?? null;
  const specs = Object.entries(l.technical_data_json ?? {});
  const isApprovedMember = profile?.status === "approved";

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <nav className="mb-6 text-xs text-muted-foreground">
          <Link to="/catalogo" className="hover:text-forest">
            Catálogo
          </Link>
          {l.categories?.name && <span> / {l.categories.name}</span>}
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-md border border-border bg-card">
              {cover ? (
                <img
                  src={cover}
                  alt={l.title}
                  className="aspect-16/10 w-full object-cover"
                  width={1280}
                  height={800}
                />
              ) : (
                <div className="flex aspect-16/10 w-full flex-col items-center justify-center gap-2 bg-secondary text-muted-foreground">
                  <ImageOff className="h-8 w-8" />
                  <span className="text-xs font-medium">Foto não disponível</span>
                </div>
              )}
            </div>
            {media.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-3">
                {media.slice(0, 4).map((m) => (
                  <img
                    key={m.url}
                    src={m.url}
                    alt={l.title}
                    loading="lazy"
                    className="aspect-4/3 w-full rounded-sm border border-border object-cover"
                  />
                ))}
              </div>
            )}

            <section className="mt-10">
              <h2 className="font-display text-lg font-semibold text-forest">Descrição</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {l.description}
              </p>
            </section>

            {specs.length > 0 && (
              <section className="mt-10">
                <h2 className="font-display text-lg font-semibold text-forest">Ficha técnica</h2>
                <dl className="mt-4 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
                  {specs.map(([k, v]) => (
                    <div key={k} className="bg-card px-4 py-3">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                      <dd className="mt-1 text-sm font-medium text-forest">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-md border border-border bg-card p-6">
              {l.categories?.name && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                  {l.categories.name}
                </span>
              )}
              <h1 className="mt-2 font-display text-2xl font-bold leading-tight text-forest">
                {l.title}
              </h1>
              <p className="mt-4 font-display text-3xl font-bold text-forest">
                {l.price_on_request ? "Sob consulta" : formatBRL(l.price)}
              </p>

              <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-accent" /> Condição:{" "}
                  <strong className="font-medium text-foreground">
                    {CONDITION_LABELS[l.condition]}
                  </strong>
                </li>
                {l.manufacture_year && (
                  <li className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-accent" /> Ano: {l.manufacture_year}
                  </li>
                )}
                {l.hours_used !== null && l.hours_used !== undefined && (
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent" /> {l.hours_used.toLocaleString("pt-BR")}{" "}
                    horas de uso
                  </li>
                )}
                {l.city && (
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" /> {l.city}/{l.state}
                  </li>
                )}
                {(l.brand || l.model) && (
                  <li className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-accent" /> {l.brand} {l.model}
                  </li>
                )}
              </ul>

              <div className="mt-6 border-t border-border pt-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendedor</p>
                <div className="mt-1 flex items-center gap-3">
                  {l.seller_profiles?.logo_url ? (
                    <img
                      src={l.seller_profiles.logo_url}
                      alt={l.seller_profiles.trade_name}
                      className="h-10 w-10 rounded-md border border-border object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-secondary text-forest">
                      <Building2 className="h-5 w-5" />
                    </span>
                  )}
                  <p className="flex items-center gap-2 font-display text-sm font-semibold text-forest">
                    {l.seller_profiles?.trade_name ?? "Vendedor verificado"}
                    {l.seller_profiles?.verification_status === "approved" && (
                      <ShieldCheck className="h-4 w-4 text-success" />
                    )}
                  </p>
                </div>
                {l.seller_profiles?.company_description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.seller_profiles.company_description}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Publicado em {formatDateBR(l.published_at)}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                {!user ? (
                  <>
                    <Button asChild className="w-full bg-forest hover:bg-forest/90">
                      <Link to="/cadastro">Solicitar acesso para negociar</Link>
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Já é membro?{" "}
                      <Link to="/entrar" className="font-medium text-forest underline">
                        Entrar
                      </Link>
                    </p>
                  </>
                ) : isApprovedMember ? (
                  <ProposalDialog
                    listingId={l.id}
                    sellerId={l.seller_id}
                    listingTitle={l.title}
                    suggestedAmount={l.price}
                  />
                ) : (
                  <div className="rounded-sm border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                    Seu cadastro ainda está em análise. Você poderá enviar propostas assim que for
                    aprovado.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-md border border-border bg-secondary/60 p-4 text-xs leading-relaxed text-muted-foreground">
              Mantenha toda a negociação registrada no DDP AGRO. A plataforma não é proprietária do
              bem anunciado e não garante o estado do equipamento.
            </div>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}
