#!/usr/bin/env bash
# Uso: pipeline/distance.sh lat1 lng1 lat2 lng2  -> km
set -euo pipefail
node -e '
  const [a, b, c, d] = process.argv.slice(1).map(Number);
  const r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
  console.log((2 * 6371 * Math.asin(Math.sqrt(h))).toFixed(1));' "$@"
