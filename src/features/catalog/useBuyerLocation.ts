import { useCallback, useEffect, useState } from "react";
import { UF_CENTROIDS, type Coords } from "@/lib/geo";

const STORAGE_KEY = "ddp:buyer-location";

export interface BuyerLocation extends Coords {
  /** Texto curto mostrado ao usuário: "Minha localização" ou "Centro de SP". */
  label: string;
  /** "gps" = navegador; "uf" = estado escolhido manualmente. */
  source: "gps" | "uf";
}

function read(): BuyerLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BuyerLocation;
    return typeof parsed?.lat === "number" && typeof parsed?.lng === "number" ? parsed : null;
  } catch {
    return null;
  }
}

/** Localização de referência do comprador, guardada só no navegador dele. */
export function useBuyerLocation() {
  const [location, setLocation] = useState<BuyerLocation | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "denied">("idle");

  // Lido após a hidratação para não divergir do HTML renderizado no servidor.
  useEffect(() => setLocation(read()), []);

  const persist = useCallback((value: BuyerLocation | null) => {
    setLocation(value);
    if (typeof window === "undefined") return;
    if (value) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const useDevice = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        persist({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "Minha localização",
          source: "gps",
        });
        setStatus("idle");
      },
      () => setStatus("denied"),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }, [persist]);

  const useState_ = useCallback(
    (uf: string) => {
      const center = UF_CENTROIDS[uf];
      if (!center) return;
      setStatus("idle");
      persist({ ...center, label: `Centro de ${uf}`, source: "uf" });
    },
    [persist],
  );

  const clear = useCallback(() => {
    setStatus("idle");
    persist(null);
  }, [persist]);

  return { location, status, useDevice, setByUf: useState_, clear };
}
