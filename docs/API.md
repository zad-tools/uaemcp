# REST API

All stable routes live under `/api/v1` and return `{ ok, data, error, meta }`.
The machine-readable OpenAPI 3.1 contract is served at `/openapi.json`; it is
the authority used to generate all six SDKs.

## Discovery

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/sources` | Official source registry |
| GET | `/api/v1/catalog` | Portals, organizations, connectors and capabilities |
| GET | `/api/v1/coverage` | Honest live/key-gated/blocked/metadata totals |
| GET | `/api/v1/search?q=...&deep=true` | Bilingual hybrid catalog and dataset search |
| GET | `/api/v1/sources/{id}/datasets` | Discover datasets |
| GET | `/api/v1/sources/{id}/schema` | Inspect inferred fields and statistics |

## Data and maps

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/sources/{id}/records` | Bounded redacted records |
| GET | `/api/v1/sources/{id}/geo` | GeoJSON with bbox, polygon or radius filtering |
| GET | `/api/v1/sources/{id}/nearest` | Nearest features |
| GET | `/api/v1/sources/{id}/aggregate` | Count, sum, average, min or max |
| GET | `/api/v1/sources/{id}/export` | JSON, CSV, XLSX or GeoJSON export |
| GET | `/api/v1/sources/{id}/tilejson` | MapLibre/Mapbox TileJSON |
| GET | `/api/v1/sources/{id}/tiles/{z}/{x}/{y}.pbf` | Mapbox Vector Tile |
| POST | `/api/v1/spatial-join` | Bounded cross-source point-radius join |
| POST | `/api/v1/entity-resolution` | Explicit cross-source entity match |

## History and intelligence

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/v1/intelligence/recipes` | Recipe catalog |
| GET | `/api/v1/intelligence/recipes/{id}` | Execute a read recipe |
| GET | `/api/v1/intelligence/indicators` | Indicator catalog |
| GET | `/api/v1/intelligence/indicators/{id}` | Calculate an explainable indicator |
| GET | `/api/v1/sources/{id}/health-history` | Historical latency, uptime and failures |
| GET/POST | `/api/v1/sources/{id}/snapshots` | List or create bounded snapshots |
| GET | `/api/v1/snapshots/diff` | Record and schema diff |

Pagination uses `limit` and `offset`. Limits are clamped by the server. Dataset
and record responses include citation, license, fetch time, quality and lineage
metadata. Unknown facts remain `null` or `unknown`; they are never inferred as
success.
