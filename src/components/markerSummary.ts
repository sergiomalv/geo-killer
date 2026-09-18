/**
 * Un marcador que apila muchos asesinatos no puede enumerarlos todos: el tooltip taparía
 * el mapa. A partir de este número se sustituye la lista por una sola línea con el recuento.
 */
export const MAX_MARKER_LINES = 3

export function shouldCollapse(count: number): boolean {
  return count > MAX_MARKER_LINES
}

/**
 * Etiqueta del marcador colapsado. `toll` es la cifra total de víctimas del caso cuando los
 * asesinatos documentados son solo una muestra (Javed Iqbal confesó 100 y el caso lista 8).
 */
export function collapsedLabel(count: number, toll: number | null): string {
  const n = toll !== null && toll > count ? toll : count
  return `${n} ${n === 1 ? 'asesinato' : 'asesinatos'}`
}
