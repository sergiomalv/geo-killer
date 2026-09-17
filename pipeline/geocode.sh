#!/usr/bin/env bash
# Uso: pipeline/geocode.sh "<ciudad>, <país>"  -> imprime "lat lng nombre"
set -euo pipefail
sleep 1  # política de uso de Nominatim: máximo 1 petición por segundo
curl -sS -G "https://nominatim.openstreetmap.org/search" \
  --data-urlencode "q=$1" \
  --data-urlencode "format=json" \
  --data-urlencode "limit=1" \
  -H "User-Agent: geo-killer-pipeline/0.1 (desarrollo local)" \
| node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const r = JSON.parse(s)[0];
    if (!r) { console.error("NOT FOUND"); process.exit(2); }
    console.log(`${Number(r.lat).toFixed(4)} ${Number(r.lon).toFixed(4)} ${r.display_name}`);
  });'
