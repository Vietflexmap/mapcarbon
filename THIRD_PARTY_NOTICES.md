# Third-party notices

## Vietflex Map

Vietflex Map 1.0.0 — Vietnam-first interactive mapping SDK.

- Project: https://github.com/Vietflexmap/VN
- Vietflex additions: MIT.
- Leaflet-derived portions retain BSD-2-Clause terms.

## Leaflet

Leaflet 1.9.4 — BSD-2-Clause. Vietflex Map is built on Leaflet and preserves Leaflet licensing notices.

## PMTiles

PMTiles JavaScript reference implementation — BSD-3-Clause.

- Project: https://github.com/protomaps/PMTiles
- Intended use in this project: optional raster PMTiles adapter for an offline Vietnam basemap supplied by the deployer.

## OpenStreetMap

Online basemap tiles are configured from the standard OpenStreetMap tile endpoint. The UI keeps attribution `© OpenStreetMap contributors`. The Service Worker intentionally does not bulk-download, prefetch or cache public OSM tiles for offline use.

## External legacy portal

The two HTTP assets at `103.71.96.34:8880` are retained only as optional compatibility configuration. They are not copied into this repository and are not required for the core application.
