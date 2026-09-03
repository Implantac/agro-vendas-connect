import { type MouseEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, Clock, Calendar, Heart, Gauge, Lock, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONDITION_LABELS, formatBRL } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

export interface ListingCardData {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  model: string | null;
  manufacture_year: number | null;
  condition: string;
  hours_used: number | null;
  price: number | null;
  price_on_request: boolean;
  city: string | null;
  state: string | null;
  categories?: { name: string; slug: string } | null;
  listing_media?: { url: string; is_cover: boolean; sort_order: number }[] | null;
}

export function ListingCard({ listing, index = 0 }: { listing: ListingCardData; index?: number }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isMember = profile?.status === "approved";

  const media = listing.listing_media?.slice().sort((a, b) => a.sort_order - b.sort_order) ?? [];
  const cover = media.find((m) => m.is_cover)?.url ?? media[0]?.url ?? FALLBACKS[index % FALLBACKS.length];

  function guard(event: MouseEvent) {
    if (isMember) return;
    event.preventDefault();
    event.stopPropagation();
    void navigate({
      to: "/entrar",
      search: { redirect: `/implementos/${listing.slug}` },
    });
  }

  const GatedLink = ({
    className,
    children,
    ariaLabel,
  }: {
    className?: string;
    children: ReactNode;
    ariaLabel?: string;
  }) => (
    <Link
      to="/implementos/$slug"
      params={{ slug: listing.slug }}
      onClick={guard}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </Link>
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-md border border-border bg-card transition-shadow hover:shadow-[0_12px_30px_-18px_oklch(0.3_0.055_158/0.6)]">
      <GatedLink className="relative block aspect-4/3 overflow-hidden bg-secondary">
        <img
          src={cover}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-sm bg-forest/90 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
          {CONDITION_LABELS[listing.condition] ?? listing.condition}
        </span>
        {!isMember && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-sm bg-background/90 px-2 py-1 text-[11px] font-semibold text-forest">
            <Lock className="h-3 w-3" /> Só para membros
          </span>
        )}
      </GatedLink>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <GatedLink className="font-display text-base font-semibold leading-snug text-forest hover:underline">
          {listing.title}
        </GatedLink>

        <p className="text-xs text-muted-foreground">
          {[listing.categories?.name, listing.brand].filter(Boolean).join(" • ")}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {listing.manufacture_year && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {listing.manufacture_year}
            </span>
          )}
          {listing.hours_used !== null && listing.hours_used !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {listing.hours_used.toLocaleString("pt-BR")} h
            </span>
          )}
          {listing.model && (
            <span className="inline-flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5" /> {listing.model}
            </span>
          )}
          {listing.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {listing.city}/{listing.state}
            </span>
          )}
        </div>

        <p className="mt-auto pt-1 font-display text-lg font-bold text-forest">
          {listing.price_on_request ? "Sob consulta" : formatBRL(listing.price)}
        </p>

        <div className="flex items-center gap-2 pt-1">
          <Button asChild size="sm" className="flex-1 bg-forest hover:bg-forest/90">
            <GatedLink>{isMember ? "Enviar proposta" : "Ser membro para negociar"}</GatedLink>
          </Button>
          <Button asChild size="sm" variant="outline" className="px-3">
            <GatedLink ariaLabel="Favoritar implemento">
              <Heart className="h-4 w-4" />
            </GatedLink>
          </Button>
        </div>
      </div>

    </article>
  );
}

