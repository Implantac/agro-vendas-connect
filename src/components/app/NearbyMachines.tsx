import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListingCard, type ListingCardData } from "@/components/catalog/ListingCard";
import { distanceToState, UF_LIST } from "@/lib/geo";
import { useBuyerLocation } from "@/features/catalog/useBuyerLocation";

const RADII = [50, 100, 250, 500] as const;

type NearbyRow = { listing: ListingCardData; km: number | null };

/**
 * "Máquinas próximas de você": distância aproximada pelo centro do estado do
 * anúncio (a plataforma não guarda coordenadas exatas de cada máquina).
 */
export function NearbyMachines({ listings }: { listings: ListingCardData[] }) {
  const { location, status, useDevice, setByUf } = useBuyerLocation();
  // null = todo o Brasil (sem filtro de distância).
  const [radius, setRadius] = useState<number | null>(null);

  const rows = useMemo<NearbyRow[]>(() => {
    const withDistance = listings.map((listing) => ({
      listing,
      km: distanceToState(location, listing.state),
    }));
    if (radius === null) return withDistance;
    return withDistance
      .filter((r): r is NearbyRow & { km: number } => r.km !== null && r.km <= radius)
      .sort((a, b) => a.km - b.km);
  }, [listings, location, radius]);

  const visible = rows.slice(0, 6);

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-forest">
            Máquinas próximas de você
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Distância aproximada, calculada pelo centro do estado do anúncio.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Raio de busca">
          <RadiusChip active={radius === null} onClick={() => setRadius(null)}>
            Todo o Brasil
          </RadiusChip>
          {RADII.map((r) => (
            <RadiusChip key={r} active={radius === r} onClick={() => setRadius(r)}>
              {r} km
            </RadiusChip>
          ))}
        </div>
      </div>

      {!location && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-4">
          <MapPin className="h-5 w-5 shrink-0 text-accent" />
          <p className="text-sm text-muted-foreground">
            Defina sua referência de localização para ver a distância das máquinas.
          </p>
          <Select onValueChange={setByUf}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Escolher estado" />
            </SelectTrigger>
            <SelectContent>
              {UF_LIST.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  Centro de {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={useDevice}
            disabled={status === "locating"}
          >
            <Navigation className="mr-2 h-4 w-4" />
            {status === "locating" ? "Localizando..." : "Usar minha localização"}
          </Button>
        </div>
      )}
      {location && (
        <p className="mt-3 text-xs text-muted-foreground">
          Referência: {location.label}{" "}
          <button
            type="button"
            onClick={() => setRadius(null)}
            className="font-medium text-accent hover:underline"
          >
            ver todo o Brasil
          </button>
        </p>
      )}

      {visible.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
          {radius === null ? (
            "Não há máquinas disponíveis no momento."
          ) : (
            <>
              Não há máquinas disponíveis nesta região.{" "}
              <button
                type="button"
                onClick={() => setRadius(null)}
                className="font-semibold text-accent hover:underline"
              >
                Ampliar para todo o Brasil
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((row, i) => (
            <ListingCard
              key={row.listing.id}
              listing={row.listing}
              index={i}
              distanceKm={row.km}
            />
          ))}
        </div>
      )}

      {rows.length > visible.length && (
        <div className="mt-6 text-center">
          <Button asChild variant="outline" size="sm">
            <Link
              to="/app/comprar"
              search={radius === null ? {} : { raio: radius }}
            >
              Ver todas as máquinas
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}

function RadiusChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground"
          : "rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-forest transition-colors hover:border-accent"
      }
    >
      {children}
    </button>
  );
}

// formatKm é usado dentro de ListingCard; mantido aqui para referência futura.
export { formatKm };
