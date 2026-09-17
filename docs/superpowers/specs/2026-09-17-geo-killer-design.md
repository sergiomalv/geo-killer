# Geo Killer — Diseño

Fecha: 2026-09-17
Estado: aprobado en brainstorming

## 1. Resumen

Minijuego web diario en el que el jugador ve en un mapa los lugares donde un asesino serial real cometió sus crímenes y debe deducir quién fue. Cada intento fallido desbloquea una pista más sobre cada lugar. Un caso por día, igual para todos, con resultado compartible estilo Wordle.

Hitos:

1. **Prototipo**: 5-10 casos, mapa, intentos, pistas y pantalla de resultado.
2. **Lanzamiento público**: 30-50 casos, compartir, estadísticas, archivo de días anteriores y pulido visual.

## 2. Reglas de juego

- Un caso por día. El "día N" se calcula como días transcurridos desde la fecha de lanzamiento definida en `schedule.json`, usando la fecha local del navegador.
- El mapa muestra todos los marcadores del caso a la vez, sin etiquetas, encuadrados automáticamente.
- El jugador responde mediante un buscador con autocompletado que acepta nombre canónico o alias (ej. "David Berkowitz" y "El hijo de Sam" son la misma respuesta). El matching ignora mayúsculas, acentos y espacios sobrantes.
- Cuatro intentos. Pistas progresivas sobre cada marcador:
  1. Intento 1: solo lugares.
  2. Intento 2: fecha de cada asesinato.
  3. Intento 3: nombre de cada víctima (o "víctima no identificada").
  4. Intento 4: cómo se llevó a cabo cada asesinato (una frase, tono documental).
  5. Fallo en el cuarto intento: derrota.
- Al terminar (victoria o derrota) se revela el asesino, su alias, país, periodo de actividad, resumen corto y enlace a Wikipedia.
- Texto para compartir, sin revelar la respuesta: `Geo Killer #N` seguido de una fila de emojis (🟥 por fallo, 🟩 por acierto, ⬛ por intento no usado) y la URL.
- Estadísticas locales: partidas jugadas, ganadas, distribución de intentos, racha actual y máxima. Solo el reto del día cuenta para la racha.
- Archivo: se pueden jugar los retos de días anteriores. No afectan a la racha pero sí se guarda su resultado.
- Contenido: solo casos cerrados (condenado, fallecido o identificado oficialmente). Los casos recientes cerrados están permitidos. Sin descripciones gráficas.
- Idioma: español. Estética noir / true crime: mapa oscuro, tipografía de expediente. Sin morbo.

## 3. Modelo de datos

Todo estático, dentro de `src/data/`.

### 3.1 `cases/<slug>.json`

```json
{
  "id": "david-berkowitz",
  "name": "David Berkowitz",
  "aliases": ["El hijo de Sam", "Son of Sam", "El asesino del calibre 44"],
  "country": "Estados Unidos",
  "activeYears": "1976-1977",
  "wikipedia": {
    "es": "https://es.wikipedia.org/wiki/David_Berkowitz",
    "en": "https://en.wikipedia.org/wiki/David_Berkowitz"
  },
  "summary": "Dos o tres frases documentales.",
  "murders": [
    {
      "city": "Nueva York",
      "region": "El Bronx",
      "country": "Estados Unidos",
      "lat": 40.8448,
      "lng": -73.8648,
      "date": "1976-07-29",
      "datePrecision": "day",
      "victim": "Donna Lauria",
      "method": "Disparo con revólver calibre 44 mientras estaba en un coche aparcado.",
      "sourceQuote": "Cita literal corta de Wikipedia que respalda este asesinato."
    }
  ],
  "validation": {
    "status": "approved",
    "validatedAt": "2026-09-17",
    "validator": "claude-sonnet-5",
    "notes": ""
  }
}
```

Reglas del esquema:

- `murders` contiene entre 3 y 8 entradas. Si el asesino tiene más víctimas documentadas se eligen las mejor documentadas.
- `lat`/`lng` corresponden al centro de la ciudad o barrio documentado, nunca a una dirección exacta.
- `date` sigue ISO 8601 con la precisión que indique la fuente; `datePrecision` es `"year"`, `"month"` o `"day"`.
- `victim` es el nombre público de la víctima o exactamente `"Víctima no identificada"`.
- `method` es una frase, sin detalle gráfico.
- `sourceQuote` es obligatorio: fragmento literal (10-40 palabras) de la página de Wikipedia referenciada.
- El esquema se define con Zod en `src/data/schema.ts` y se valida en CI y antes de cada build.

### 3.2 `killers.json`

Lista de autocompletado de 150-200 asesinos, independiente del catálogo de casos, para que el autocompletado no delate qué casos existen.

```json
[
  { "id": "david-berkowitz", "name": "David Berkowitz", "aliases": ["El hijo de Sam", "Son of Sam"] }
]
```

Todo caso de `cases/` debe existir en `killers.json` con el mismo `id`; el script de esquema lo comprueba.

### 3.3 `schedule.json`

```json
{
  "launchDate": "2026-10-01",
  "order": ["david-berkowitz", "ted-bundy", "..."]
}
```

Día N = días entre `launchDate` y hoy. Caso del día = `order[N mod order.length]`. Añadir casos es añadir al final de `order`; los días pasados nunca cambian de caso. Antes de `launchDate` se muestra el día 0.

### 3.4 localStorage

- `geokiller.stats`: `{ played, won, distribution: [n1, n2, n3, n4], currentStreak, maxStreak, lastPlayedDay }`.
- `geokiller.progress.<dayNumber>`: `{ guesses: string[], status: "playing" | "won" | "lost" }`. Permite cerrar y reabrir la pestaña sin perder la partida.

Lectura y escritura pasan por `game/storage.ts`, que valida con Zod y reinicia el valor con aviso si está corrupto.

## 4. Arquitectura frontend

Stack: Vite + React + TypeScript, Leaflet con tiles oscuros de CartoDB (sin API key), Vitest, Zod. Sin backend. Deploy estático (Vercel o Netlify).

Estructura:

```
src/
  data/            JSON de casos, killers, schedule y schema.ts
  game/
    engine.ts      lógica pura: evaluar intento, nivel de pista, estado final
    schedule.ts    caso del día a partir de la fecha
    matching.ts    normalización y comparación de nombres/alias
    storage.ts     localStorage tipado
    share.ts       texto para compartir
  components/
    CaseMap        Leaflet, marcadores y popups según nivel de pista
    GuessInput     autocompletado sobre killers.json
    ClueTracker    intentos usados y pistas desbloqueadas
    ResultCard     revelación, resumen, enlace y botón compartir
    StatsModal     estadísticas y racha
    ArchivePage    lista de días anteriores
  pages/
    Today, Archive
```

Principios:

- `game/*` no importa React ni DOM. Toda la lógica de juego se prueba con Vitest sin navegador.
- Los componentes reciben el estado del juego por props y emiten eventos; no leen localStorage directamente.
- Los casos se cargan con `import.meta.glob` para que solo el caso del día entre en el bundle inicial.

Errores:

- Id del schedule sin caso correspondiente: pantalla "Hoy no hay reto" y registro en consola.
- localStorage inaccesible o corrupto: se juega sin persistencia y se avisa discretamente.
- Tiles sin red: los marcadores se siguen mostrando sobre el fondo oscuro del contenedor.

Testing:

- Unitarios (Vitest): engine, schedule (incluyendo cambio de día y módulo), matching (acentos, alias, mayúsculas), share, storage.
- Script `npm run validate:data`: ejecuta el esquema Zod sobre todos los JSON y la coherencia entre `cases/`, `killers.json` y `schedule.json`.
- Playwright (opcional en prototipo, obligatorio en lanzamiento): flujo completo ganar y perder.

## 5. Pipeline de generación de casos

Se ejecuta desde Claude Code, nunca en producción. Los agentes viven en `.claude/agents/` y las listas semilla y salidas en `pipeline/`.

### 5.1 Generador (`case-generator`, modelo Haiku 4.5)

Entrada: nombre del asesino, URL(s) de Wikipedia y el esquema JSON.
Salida: un único objeto JSON conforme al esquema, sin prosa.

Reglas antialucinación (van en el prompt del agente):

1. Solo se incluyen asesinatos que aparezcan en la página de Wikipedia indicada. Nada de memoria propia.
2. Si un dato no está en la fuente, se escribe `null` (fecha, región) o `"Víctima no identificada"`. Prohibido completar o estimar.
3. `lat`/`lng` son los del centro de la ciudad o barrio nombrado en la fuente. Nunca direcciones exactas.
4. Las fechas llevan solo la precisión que da la fuente; `datePrecision` debe reflejarla.
5. Cada asesinato incluye `sourceQuote` con un fragmento literal de la página. Sin cita no hay entrada.
6. Máximo 8 asesinatos, mínimo 3. Priorizar los mejor documentados.
7. El caso debe estar cerrado; si la fuente indica que el autor no fue identificado o condenado, devolver `{ "rejected": "caso abierto" }`.
8. `method` en una frase, tono documental, sin detalle gráfico.
9. Nombres de ciudades y países en español.

### 5.2 Validador (`case-validator`, modelo Sonnet 5)

Entrada: el JSON generado.
Herramientas: WebFetch sobre las URL de Wikipedia (español primero; inglés como respaldo si falta información).
Salida: JSON con veredicto.

```json
{
  "verdict": "approved" | "rejected",
  "murderVerdicts": [{ "index": 0, "ok": true, "errors": [] }],
  "caseErrors": ["..."]
}
```

Comprobaciones:

1. El asesino existe y la página confirma que el caso está cerrado.
2. Nombre canónico y alias aparecen en la página.
3. Para cada asesinato: víctima, fecha (con su precisión) y ciudad aparecen en el texto; `sourceQuote` existe literalmente en la página; `lat`/`lng` están a menos de ~30 km de la ciudad indicada (usando el conocimiento del validador o Nominatim si hay duda).
4. `method` no contradice la fuente ni contiene detalle gráfico.
5. Un asesinato con cualquier dato no verificable se marca `ok: false`. Si quedan menos de 3 asesinatos válidos, el caso se rechaza.

El validador no corrige datos, solo informa. Así el generador y el validador no comparten la misma alucinación.

### 5.3 Orquestación

Para cada nombre de la lista semilla `pipeline/seed-killers.txt`:

1. Generar.
2. Validar.
3. Si `rejected`: regenerar pasando el informe de errores. Máximo 2 reintentos.
4. Si sigue rechazado: guardar en `pipeline/rejected/<slug>.json` con el informe y pasar al siguiente.
5. Si `approved`: eliminar los asesinatos marcados `ok: false`, añadir el bloque `validation` y guardar en `src/data/cases/<slug>.json`.

Al final: resumen en tabla (aprobados, rechazados, motivo) para revisión humana rápida, y `npm run validate:data` como última barrera.

`killers.json` se genera con el mismo ciclo, validando solo nombre, alias y existencia de la página de Wikipedia. Coste orientativo: dos o tres llamadas a Haiku y una o dos a Sonnet por caso.

## 6. Fuera de alcance

- Backend, cuentas de usuario, rankings globales.
- Modos de juego distintos de "adivinar quién".
- Traducción al inglés (se deja preparado el texto de UI en un único módulo para facilitarla más adelante).
- Casos abiertos o no resueltos.
