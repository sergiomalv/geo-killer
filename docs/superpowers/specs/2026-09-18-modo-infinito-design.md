# Geo Killer — Modo infinito

Fecha: 2026-09-18
Estado: aprobado en brainstorming
Base: rama `feat/modo-infinito` sobre `feat/prototipo`

## 1. Qué es

Un modo de juego alternativo al reto diario: casos encadenados al azar, sin límite. Al terminar un caso (ganado o perdido) aparece "Siguiente caso", que carga otro elegido al azar entre los que aún no se han jugado en esta vuelta. Cuando se agotan, se reinicia la lista y se avisa con "Vuelta completa: los casos se repiten". Las reglas de cada caso son las del reto diario: cuatro intentos y pistas progresivas.

Se muestra una **racha**: aciertos consecutivos. Sube con cada caso ganado y vuelve a 0 al perder.

## 2. Acceso

- Enlace "Modo infinito" en la cabecera de la página del reto diario, junto a "Caso #N".
- La URL lleva `#infinito`. `App` lee `location.hash` al arrancar y escucha `hashchange`; no se añade router.
- En el modo infinito la cabecera muestra "Racha: N" y un enlace "Reto diario" (`#`) para volver.

## 3. Persistencia

Clave `geokiller.infinite` en localStorage con `{ caseId, guesses, status, played, streak, wrapped }`, validada con Zod como el progreso diario; si está corrupta se descarta y se empieza de cero. Si el caso guardado ya no existe en el catálogo, se empieza de cero. No toca las claves `geokiller.progress.<día>`.

## 4. Arquitectura

- `src/game/infinite.ts` (lógica pura): `InfiniteState`, `pickNextCase(available, played, random)`, `startInfinite(available, random)`, `infiniteGuess(state, killerId)`, `nextInfiniteCase(state, available, random)`. El generador aleatorio se inyecta para que los tests sean deterministas.
- `src/game/storage.ts`: `loadInfinite()` y `saveInfinite()`; las funciones existentes se reescriben sobre un par interno `loadJson`/`saveJson` para no duplicar el manejo de errores.
- `src/components/GameBoard.tsx`: el tablero común (mapa, intentos, buscador, resultado, lista de pistas) extraído de `TodayPage`. Recibe `caseData`, `killers`, `state`, `onGuess` y un `afterResult` opcional que se muestra al terminar.
- `src/pages/TodayPage.tsx`: conserva su estado y su cabecera; renderiza `GameBoard`. Comportamiento y tests sin cambios, salvo el enlace nuevo en la cabecera.
- `src/pages/InfinitePage.tsx`: estado `InfiniteState`, carga del caso con `loadCase` (estados cargando/error), botón "Siguiente caso" en `afterResult`, aviso de vuelta completa.
- `src/App.tsx`: hook `useHashMode()` que devuelve `'daily' | 'infinite'`; renderiza `InfinitePage` o el flujo diario existente.

## 5. Errores

- Caso del modo infinito que no carga: mensaje de error y botón "Siguiente caso" que elige otro.
- Storage inaccesible: se juega sin persistencia, como en el reto diario.

## 6. Tests

- Unitarios: `infinite.ts` (sin repeticiones hasta agotar, vuelta completa, racha), `storage.ts` (nuevas claves y refactor), `GameBoard` a través de los tests de `TodayPage`, `InfinitePage` (ganar sube la racha, perder la reinicia, siguiente caso, persistencia), `App` (el hash cambia de modo).
- Verificación en navegador con Playwright: entrar por `#infinito`, jugar dos casos seguidos, comprobar racha y persistencia tras recargar.

## 7. Fuera de alcance

Estadísticas globales, compartir, archivo, y cualquier cambio en el pipeline de contenido.
