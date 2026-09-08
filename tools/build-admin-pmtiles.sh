#!/usr/bin/env bash
set -euo pipefail

# Build Vietnam post-merger administrative boundaries into one vector PMTiles archive.
# Sources:
#   - Lookup/UI model inspiration: https://github.com/Vietflexmap/anhmap
#   - Geometry + codes: https://github.com/thanglequoc/vietnamese-provinces-database (MIT)
# Output:
#   data/vietnam-admin.pmtiles

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="${WORK:-$ROOT/.tmp/admin-pmtiles}"
ZIP_URL="${ADMIN_GEOJSON_ZIP_URL:-https://raw.githubusercontent.com/thanglequoc/vietnamese-provinces-database/master/json/vn_provinces_wards_geojson.zip}"
OUT="${OUT:-$ROOT/data/vietnam-admin.pmtiles}"

for cmd in curl unzip jq tippecanoe pmtiles; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing dependency: $cmd" >&2; exit 2; }
done

rm -rf "$WORK"
mkdir -p "$WORK/src" "$(dirname "$OUT")"

echo "[1/5] Downloading GeoJSON archive…"
curl --fail --location --retry 3 "$ZIP_URL" -o "$WORK/admin.zip"

echo "[2/5] Extracting…"
unzip -q "$WORK/admin.zip" -d "$WORK/src"

PROV="$WORK/provinces.ndjson"
WARD="$WORK/wards.ndjson"
: > "$PROV"
: > "$WARD"

# Each source file is a FeatureCollection containing exactly one feature.
# Preserve source properties and add a stable CarbonVN admin level marker.
echo "[3/5] Normalizing province/ward features…"
while IFS= read -r -d '' f; do
  if [[ "$f" == */wards/* ]]; then
    jq -c '.features[] | .properties = ((.properties // {}) + {carbonvn_admin_level:"ward"})' "$f" >> "$WARD"
  else
    jq -c '.features[] | .properties = ((.properties // {}) + {carbonvn_admin_level:"province"})' "$f" >> "$PROV"
  fi
done < <(find "$WORK/src" -type f -name '*.geojson' -print0)

PROV_COUNT=$(wc -l < "$PROV" | tr -d ' ')
WARD_COUNT=$(wc -l < "$WARD" | tr -d ' ')
echo "Province features: $PROV_COUNT"
echo "Ward/commune features: $WARD_COUNT"

if [[ "$PROV_COUNT" -lt 34 || "$WARD_COUNT" -lt 3000 ]]; then
  echo "Unexpected feature counts; aborting to avoid publishing an incomplete archive." >&2
  exit 3
fi

echo "[4/5] Creating vector MBTiles…"
tippecanoe \
  -o "$WORK/vietnam-admin.mbtiles" \
  -Z4 -z14 \
  --force \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --detect-shared-borders \
  --coalesce-densest-as-needed \
  -L "province:$PROV" \
  -L "ward:$WARD"

echo "[5/5] Converting MBTiles → PMTiles…"
pmtiles convert "$WORK/vietnam-admin.mbtiles" "$OUT"

ls -lh "$OUT"
echo "Done: $OUT"
echo "Layers: province=$PROV_COUNT, ward=$WARD_COUNT"
