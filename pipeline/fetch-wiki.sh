#!/usr/bin/env bash
# Uso: pipeline/fetch-wiki.sh <lang> <título_de_wikipedia> <slug>
set -euo pipefail
lang="$1"; title="$2"; slug="$3"
out="pipeline/sources/${slug}.${lang}.txt"
mkdir -p pipeline/sources

body=$(curl -s -f -G "https://${lang}.wikipedia.org/w/api.php" \
  --data-urlencode "action=query" \
  --data-urlencode "prop=extracts" \
  --data-urlencode "explaintext=1" \
  --data-urlencode "redirects=1" \
  --data-urlencode "format=json" \
  --data-urlencode "formatversion=2" \
  --data-urlencode "titles=${title}" \
  -H "User-Agent: geo-killer-pipeline/0.1 (desarrollo local)") \
  || { echo "ERROR: fallo de red o HTTP al consultar Wikipedia" >&2; exit 3; }

set +e
printf '%s' "$body" | node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const page = JSON.parse(s).query.pages[0];
    if (page.missing || !page.extract) { console.error("MISSING: " + page.title); process.exit(2); }
    process.stdout.write(page.extract);
  });' > "$out"
status="${PIPESTATUS[1]:-$?}"
set -e

if [ "$status" -ne 0 ]; then
  rm -f "$out"
  exit 2
fi

size=$(wc -c < "$out")
echo "$out ($size bytes)"

if [ "$size" -lt 2000 ]; then
  echo "WARNING: extracto corto" >&2
fi
