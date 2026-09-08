# Third-party notices

## Vietflex Map

Vietflex Map 1.0.0 — Vietnam-first interactive mapping SDK.

- Project: https://github.com/Vietflexmap/VN
- Vietflex additions: MIT.
- Leaflet-derived portions retain BSD-2-Clause terms.

## Leaflet

Leaflet 1.9.4 — BSD-2-Clause. Vietflex Map is built on Leaflet and preserves Leaflet licensing notices.

## PMTiles

PMTiles — BSD-3-Clause.

- Project: https://github.com/protomaps/PMTiles
- CarbonVN uses PMTiles JS to read the administrative vector archive.
- `assets/admin-pmtiles.js` also uses Mapbox Vector Tile and PBF-compatible JavaScript packages loaded from jsDelivr; their upstream licenses remain applicable.

## Vietflexmap/anhmap — administrative boundaries

- Project: https://github.com/Vietflexmap/anhmap
- CarbonVN v2.3 reuses the administrative PMTiles payload and administrative index embedded in `anhmap/index.html`.
- Current source commit: `e80f4ee9f1e167817e4a9af8402c0bca4052573e`.
- `.github/workflows/sync-anhmap-admin.yml` extracts:
  - `pmtilesData` → `data/vietnam-admin.pmtiles`;
  - `adminData` → `data/admin-data.json`.
- Exact provenance is written to `data/anhmap-source.json`.
- CarbonVN does not claim ownership over upstream administrative boundary data. Copyright, attribution, license, legal status and source-data conditions inherited by ẢnhMap/Vietflexmap/VN remain applicable.

ẢnhMap's own third-party notice states that its PMTiles/boundary data retain the copyright, license, conditions of use and attribution requirements of their input source and are inherited from `Vietflexmap/VN`. CarbonVN preserves that chain of provenance rather than relicensing the boundary dataset as CarbonVN code.

## OpenStreetMap

Online basemap tiles use the standard OpenStreetMap endpoint. The UI keeps attribution `© OpenStreetMap contributors`. CarbonVN intentionally does not bulk-download or prefetch public OSM tiles for offline use.

## External legacy portal

The HTTP assets at `103.71.96.34:8880` are retained only as optional compatibility configuration. They are not copied into this repository and are not required by the core application.

## CarbonVN application license

The CarbonVN application code is MIT licensed where stated. That MIT license does not override licenses or usage conditions attached to third-party libraries, map data, administrative boundaries, OSM content or external services.
