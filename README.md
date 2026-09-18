# Geo Killer

Minijuego diario: adivina al asesino serial a partir de los lugares de sus crímenes. Cada fallo desbloquea una pista más (fechas, víctimas, método). Cuatro intentos.

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
