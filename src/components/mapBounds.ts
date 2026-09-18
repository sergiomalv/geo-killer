export type LatLng = { lat: number; lng: number }
export type Bounds = [[number, number], [number, number]]

export function boundsFor(points: LatLng[]): Bounds {
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return [[minLat, minLng], [maxLat, maxLng]]
}
