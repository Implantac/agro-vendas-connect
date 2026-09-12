/**
 * Distância aproximada entre o comprador e o anúncio.
 *
 * A plataforma ainda não guarda coordenadas exatas de cada máquina, então a
 * referência é o centro geográfico do estado (UF) informado no anúncio.
 * Por isso todo texto exibido deve deixar claro que o valor é aproximado.
 */

export interface Coords {
  lat: number;
  lng: number;
}

/** Centro aproximado de cada unidade federativa brasileira. */
export const UF_CENTROIDS: Record<string, Coords> = {
  AC: { lat: -9.02, lng: -70.81 },
  AL: { lat: -9.57, lng: -36.78 },
  AP: { lat: 1.41, lng: -51.77 },
  AM: { lat: -3.42, lng: -64.79 },
  BA: { lat: -12.47, lng: -41.71 },
  CE: { lat: -5.2, lng: -39.53 },
  DF: { lat: -15.78, lng: -47.93 },
  ES: { lat: -19.57, lng: -40.61 },
  GO: { lat: -15.93, lng: -50.14 },
  MA: { lat: -5.08, lng: -45.28 },
  MT: { lat: -12.64, lng: -55.42 },
  MS: { lat: -20.51, lng: -54.54 },
  MG: { lat: -18.1, lng: -44.38 },
  PA: { lat: -3.79, lng: -52.48 },
  PB: { lat: -7.28, lng: -36.72 },
  PR: { lat: -24.89, lng: -51.55 },
  PE: { lat: -8.38, lng: -37.86 },
  PI: { lat: -7.72, lng: -42.73 },
  RJ: { lat: -22.25, lng: -42.66 },
  RN: { lat: -5.81, lng: -36.59 },
  RS: { lat: -29.68, lng: -53.21 },
  RO: { lat: -10.94, lng: -62.83 },
  RR: { lat: 2.05, lng: -61.4 },
  SC: { lat: -27.24, lng: -50.22 },
  SP: { lat: -22.19, lng: -48.79 },
  SE: { lat: -10.57, lng: -37.45 },
  TO: { lat: -10.17, lng: -48.3 },
};

export const UF_LIST = Object.keys(UF_CENTROIDS).sort();

/** Distância em km pela fórmula de haversine. */
export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distância aproximada até um anúncio, usando o centro do estado dele. */
export function distanceToState(from: Coords | null, state: string | null | undefined) {
  if (!from || !state) return null;
  const target = UF_CENTROIDS[state.toUpperCase()];
  if (!target) return null;
  return haversineKm(from, target);
}

export function formatKm(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString("pt-BR")} km`;
}
