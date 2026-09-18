import tollsJson from './tolls.json'
import { tollsSchema, type Toll } from './schema'

export interface TollIndex {
  /** Ids con cifra, ordenados alfabéticamente. */
  ids: string[]
  byId: (id: string) => Toll | undefined
  /** Cifras confirmadas por id, que es lo único que usa la lógica de la partida. */
  counts: Record<string, number>
}

export function buildIndex(list: Toll[]): TollIndex {
  const map = new Map(list.map((t) => [t.id, t]))
  const counts: Record<string, number> = {}
  for (const t of list) counts[t.id] = t.confirmed
  return {
    // Sale de `map`, no de `list`, para que quede coherente con `byId` y `counts` si hay
    // ids repetidos: las tres propiedades deduplican igual, "la última gana".
    ids: [...map.keys()].sort(),
    byId: (id: string) => map.get(id),
    counts,
  }
}

// El fichero se valida al cargar el módulo: un dato mal formado debe romper en el arranque,
// no a mitad de una partida.
export const tolls: TollIndex = buildIndex(tollsSchema.parse(tollsJson))
