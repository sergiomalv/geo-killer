export type MarkerGroup = { lat: number; lng: number; indexes: number[] }

/** Agrupa los asesinatos con coordenadas idénticas, conservando el orden de aparición. */
export function groupByCoordinates(points: { lat: number; lng: number }[]): MarkerGroup[] {
  const groups = new Map<string, MarkerGroup>()
  points.forEach((p, i) => {
    const key = `${p.lat},${p.lng}`
    const g = groups.get(key)
    if (g) g.indexes.push(i)
    else groups.set(key, { lat: p.lat, lng: p.lng, indexes: [i] })
  })
  return [...groups.values()]
}
