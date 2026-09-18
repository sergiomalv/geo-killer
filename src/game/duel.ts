/** Milisegundos que la carta revelada se queda a la vista antes de encadenar la ronda siguiente. */
export const REVEAL_MS = 1400

export type Choice = 'higher' | 'lower'
export type DuelStatus = 'playing' | 'revealed' | 'lost'

/**
 * Elige un asesino que no se haya usado en esta partida. Al agotarse la lista, la recicla desde
 * cero, igual que `pickNextCase` en el modo infinito. `exclude` evita que el reciclado devuelva
 * al asesino que ya está en la carta izquierda, que daría un duelo de alguien contra sí mismo.
 * `random` devuelve [0, 1).
 */
export function pickNextKiller(
  available: string[],
  seen: string[],
  random: () => number,
  exclude?: string,
): { id: string; seen: string[] } {
  let candidates = available.filter((id) => !seen.includes(id) && id !== exclude)
  let base = seen
  if (candidates.length === 0) {
    candidates = available.filter((id) => id !== exclude)
    base = []
  }
  if (candidates.length === 0) throw new Error('No hay asesinos disponibles')
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length))
  const id = candidates[index]
  return { id, seen: [...base, id] }
}
