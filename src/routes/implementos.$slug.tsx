import { useEffect } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  MapPin,
  ShieldCheck,
  Calendar,
  Clock,
  Gauge,
  Building2,
  Lock,
  Hash,
  Zap,
  CheckCircle2,
} from "lucide-react";

import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { CONDITION_LABELS, LISTING_STATUS_LABELS, formatBRL, formatDateBR } from "@/lib/format";
import { fetchListingBySlug } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { ProposalDialog } from "@/components/catalog/ProposalDialog";
import { ListingGallery } from "@/components/catalog/ListingGallery";
import { TrustBadges } from "@/components/catalog/TrustBadges";
import { FavoriteButton } from "@/components/catalog/FavoriteButton";
import { fetchSellerTrust, registerListingView } from "@/features/listings/queries";
import { listingCode, orderedSpecs } from "@/features/listings/completeness";
import { trustBadges } from "@/features/listings/trust";

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

  return <ListingView listing={listing} userId={user.id} />;
}

type ListingData = {
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
  status: string;
  published_at: string | null;
  technical_data_json: Record<string, string>;
  category_id: string | null;
  categories?: { name: string; slug: string } | null;
  listing_media?: { url: string; is_cover: boolean; sort_order: number }[];
  seller_profiles?: {
    trade_name: string;
    company_description: string | null;
    verification_status: string;
    logo_url?: string | null;
  } | null;
};

function ListingView({ listing, userId }: { listing: unknown; userId: string }) {
  const l = listing as ListingData;
  const isOwner = l.seller_id === userId;

  useEffect(() => {
    if (!isOwner) void registerListingView(l.id);
  }, [l.id, isOwner]);

  const { data: sellerTrust } = useQuery({
    queryKey: ["seller-trust", l.seller_id],
    queryFn: () => fetchSellerTrust(l.seller_id),
  });

  const media = (l.listing_media ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const specs = orderedSpecs(l.technical_data_json);
  const power = l.technical_data_json?.["potencia"] ?? l.technical_data_json?.["potencia_cv"];
  const badges = trustBadges({
    sellerStatus: sellerTrust?.profile?.status,
    sellerPhone: sellerTrust?.profile?.phone,
    companyVerification: l.seller_profiles?.verification_status,
    listingStatus: l.status,
    photos: media.length,
    technical: l.technical_data_json,
  });
  const available = l.status === "approved";
  const headline = [l.brand, l.model].filter(Boolean).join(" ");

  const summary = [
    { icon: Gauge, label: "Condição", value: CONDITION_LABELS[l.condition] ?? l.condition },
    {
      icon: Clock,
      label: "Horas de uso",
      value: l.hours_used != null ? `${l.hours_used.toLocaleString("pt-BR")} h` : "Não informado",
    },
    { icon: Zap, label: "Potência", value: power ? String(power) : "Não informada" },
    {
      icon: MapPin,
      label: "Localização",
      value: l.city ? `${l.city}/${l.state}` : "Não informada",
    },
    {
      icon: CheckCircle2,
      label: "Disponibilidade",
      value: available ? "Disponível" : (LISTING_STATUS_LABELS[l.status] ?? l.status),
    },
  ];

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <nav className="mb-4 text-xs text-muted-foreground">
          <Link to="/catalogo" className="hover:text-forest">
            Catálogo
          </Link>
          {l.categories?.name && <span> / {l.categories.name}</span>}
        </nav>

        {/* Cabeçalho */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
              {l.categories?.name && <span className="text-accent">{l.categories.name}</span>}
              <span
                className={
                  available
                    ? "rounded-sm bg-success/10 px-2 py-0.5 text-success"
                    : "rounded-sm bg-warning/15 px-2 py-0.5 text-warning"
                }
              >
                {available ? "Disponível" : (LISTING_STATUS_LABELS[l.status] ?? l.status)}
              </span>
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold leading-tight text-forest sm:text-3xl">
              {l.title}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {headline && <span className="font-medium text-foreground">{headline}</span>}
              {l.manufacture_year && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {l.manufacture_year}
                </span>
              )}
              {l.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {l.city}/{l.state}
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-mono text-xs">
                <Hash className="h-3.5 w-3.5" /> {listingCode(l.id)}
              </span>
            </p>
          </div>
          <TrustBadges badges={badges} className="max-w-md justify-end" />
        </header>

        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <ListingGallery media={media} title={l.title} />

            {/* Resumo comercial */}
            <section className="mt-8 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-5">
              {summary.map((s) => (
                <div key={s.label} className="bg-card px-4 py-3">
                  <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <s.icon className="h-3.5 w-3.5 text-accent" /> {s.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-forest">{s.value}</p>
                </div>
              ))}
            </section>

            <section className="mt-10">
              <h2 className="font-display text-lg font-semibold text-forest">Descrição</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {l.description}
              </p>
            </section>

            <section className="mt-10">
              <h2 className="font-display text-lg font-semibold text-forest">Ficha técnica</h2>
              <dl className="mt-4 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Marca", value: l.brand },
                  { label: "Modelo", value: l.model },
                  { label: "Ano", value: l.manufacture_year ? String(l.manufacture_year) : null },
                  {
                    label: "Horas",
                    value:
                      l.hours_used != null ? `${l.hours_used.toLocaleString("pt-BR")} h` : null,
                  },
                  ...specs.map((s) => ({ label: s.label, value: s.value })),
                ]
                  .filter((s) => s.value)
                  .map((s) => (
                    <div key={s.label} className="bg-card px-4 py-3">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                        {s.label}
                      </dt>
                      <dd className="mt-1 text-sm font-medium text-forest">{s.value}</dd>
                    </div>
                  ))}
              </dl>
              {specs.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  O vendedor ainda não detalhou potência, transmissão e demais itens. Pergunte na
                  negociação.
                </p>
              )}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-md border border-border bg-card p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Preço</p>
              <p className="mt-1 font-display text-3xl font-bold text-forest">
                {l.price_on_request ? "Sob consulta" : formatBRL(l.price)}
              </p>

              <div className="mt-5 space-y-3">
                {isOwner ? (
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/app/anuncio/$id" params={{ id: l.id }}>
                      Editar meu anúncio
                    </Link>
                  </Button>
                ) : available ? (
                  <>
                    <ProposalDialog
                      listingId={l.id}
                      sellerId={l.seller_id}
                      listingTitle={l.title}
                      suggestedAmount={l.price}
                    />
                    <FavoriteButton listingId={l.id} size="default" withLabel className="w-full" />
                  </>
                ) : (
                  <div className="rounded-sm border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                    Este anúncio não está disponível para novas propostas no momento.
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Vendedor</p>
                <div className="mt-2 flex items-center gap-3">
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
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-forest">
                      {l.seller_profiles?.trade_name ??
                        sellerTrust?.profile?.full_name ??
                        "Vendedor"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Publicado em {formatDateBR(l.published_at)}
                    </p>
                  </div>
                </div>
                {l.seller_profiles?.company_description && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {l.seller_profiles.company_description}
                  </p>
                )}
                <TrustBadges badges={badges} compact className="mt-3" />
              </div>
            </div>

            <div className="mt-4 rounded-md border border-border bg-secondary/60 p-4 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mb-1 h-4 w-4 text-forest" />
              Mantenha toda a negociação registrada no DDP AGRO. A plataforma não é proprietária do
              bem anunciado e não garante o estado do equipamento — combine vistoria antes de
              fechar.
            </div>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}
