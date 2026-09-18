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
