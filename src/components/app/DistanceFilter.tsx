import { Crosshair, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UF_LIST } from "@/lib/geo";
import { useBuyerLocation } from "@/features/catalog/useBuyerLocation";

export const RADIUS_OPTIONS = [100, 250, 500, 1000];

/** Define a localização de referência do comprador e o raio de busca. */
export function DistanceFilter({
  radius,
  onRadiusChange,
}: {
  radius: number | undefined;
  onRadiusChange: (km: number | undefined) => void;
}) {
  const { location, status, useDevice, setByUf, clear } = useBuyerLocation();

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Distância
      </Label>

      {location ? (
        <div className="flex items-center justify-between gap-2 rounded-sm border border-border bg-secondary/40 px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-forest">
            <MapPin className="h-3.5 w-3.5" /> {location.label}
          </span>
          <button
            type="button"
            onClick={() => {
              clear();
              onRadiusChange(undefined);
            }}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-forest"
          >
            <X className="h-3.5 w-3.5" /> Remover
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={useDevice}
            disabled={status === "locating"}
          >
            <Crosshair className="mr-1.5 h-4 w-4" />
            {status === "locating" ? "Localizando..." : "Usar minha localização"}
          </Button>
          {status === "denied" && (
            <p className="text-[11px] text-muted-foreground">
              Não foi possível obter sua localização. Escolha um estado de referência.
            </p>
          )}
          <Select onValueChange={setByUf}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Ou escolher um estado" />
            </SelectTrigger>
            <SelectContent>
              {UF_LIST.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Select
        value={radius ? String(radius) : "all"}
        onValueChange={(v) => onRadiusChange(v === "all" ? undefined : Number(v))}
        disabled={!location}
      >
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Raio de busca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Qualquer distância</SelectItem>
          {RADIUS_OPTIONS.map((km) => (
            <SelectItem key={km} value={String(km)}>
              Até {km.toLocaleString("pt-BR")} km
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Distância aproximada: calculada pelo centro do estado do anúncio, não pelo endereço exato
        da máquina.
      </p>
    </div>
  );
}
