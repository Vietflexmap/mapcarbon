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
- CarbonVN uses the PMTiles format/CLI in the optional administrative-boundary build pipeline.
- `data/vietnam-admin.pmtiles` is generated from sourced GeoJSON; it is not claimed to originate from `Vietflexmap/anhmap`.

## Vietnam administrative GIS dataset

Vietnamese Provinces Database by Thang Le Quoc — MIT License.

- Project: https://github.com/thanglequoc/vietnamese-provinces-database
- CarbonVN uses the post-reorganization administrative metadata and GeoJSON boundary exports for 34 provinces and their ward/commune/special-zone units.
- Upstream license copyright notice is retained by reference and the upstream MIT terms apply to copied/derived dataset portions.

## Vietflexmap/anhmap

- Project: https://github.com/Vietflexmap/anhmap
- CarbonVN reuses the interaction concept/hierarchy for province → ward/commune lookup and offline-oriented map workflow.
- At the time of the v2.2 integration, `anhmap` did not expose a standalone `.pmtiles` archive in its repository tree; CarbonVN therefore does not mislabel another geometry source as an `anhmap` PMTiles file.

## OpenStreetMap

Online basemap tiles are configured from the standard OpenStreetMap tile endpoint. The UI keeps attribution `© OpenStreetMap contributors`. The Service Worker intentionally does not bulk-download, prefetch or cache public OSM tiles for offline use.

## External legacy portal

The two HTTP assets at `103.71.96.34:8880` are retained only as optional compatibility configuration. They are not copied into this repository and are not required for the core application.
