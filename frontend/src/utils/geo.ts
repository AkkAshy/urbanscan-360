/** Географическая точка. */
export interface LatLon {
  lat: number;
  lon: number;
}

const toRad = (d: number) => (d * Math.PI) / 180;

/**
 * Азимут (начальный) от точки `from` к `to`, градусы 0..360.
 * 0 = север, 90 = восток. Формула портирована из backend (calculate_bearing).
 */
export function bearing(from: LatLon, to: LatLon): number {
  const phi1 = toRad(from.lat);
  const phi2 = toRad(to.lat);
  const dLon = toRad(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  const deg = Math.atan2(y, x) * (180 / Math.PI);
  return (deg + 360) % 360;
}

/** Расстояние между точками в километрах (haversine). */
export function haversineKm(from: LatLon, to: LatLon): number {
  const R = 6371;
  const dPhi = toRad(to.lat - from.lat);
  const dLambda = toRad(to.lon - from.lon);
  const phi1 = toRad(from.lat);
  const phi2 = toRad(to.lat);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
