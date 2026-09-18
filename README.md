# Geo Killer

Minijuego diario: adivina al asesino serial a partir de los lugares de sus crímenes. Cada fallo desbloquea una pista más (fechas, víctimas, método). Cuatro intentos.

Además del reto diario hay un **modo infinito** (`#infinito`) y **"Más o menos"** (`#mas-o-menos`), una cadena de duelos a una vida en la que se acierta si un asesino mató más o menos víctimas confirmadas que el anterior. El empate cuenta como acierto. Las cifras viven en `src/data/tolls.json`, se generan con los subagentes `toll-generator` y `toll-validator` y se promueven con `pipeline/promote-tolls.ts`; cada una va respaldada por una cita literal de Wikipedia. Un asesino sin cifra confirmada citable se queda fuera del modo, y `npm run validate:data` avisa de cuáles faltan.

## Desarrollo

```bash
npm install
npm run dev          # servidor de desarrollo
npm test             # tests unitarios (Vitest)
npm run validate:data
npm run build        # ejecuta validate:data antes de compilar
```

## Contenido

Los casos de `src/data/cases/` se generan con el pipeline de `pipeline/` y los subagentes de `.claude/agents/` desde Claude Code, y se verifican dato a dato contra el texto de Wikipedia. Ver `docs/superpowers/specs/2026-09-17-geo-killer-design.md`, sección 5.

## Despliegue

El juego se publica en GitHub Pages desde `.github/workflows/deploy.yml` en cada push a `main`: lint, tests, `npm run build` y subida de `dist/`. La URL es https://sergiomalv.github.io/geo-killer/ y por eso `vite.config.ts` fija `base: '/geo-killer/'`; si el repo cambia de nombre hay que cambiar ese `base`. La navegación va por hash (`#infinito`), así que no hacen falta reglas de reescritura.
