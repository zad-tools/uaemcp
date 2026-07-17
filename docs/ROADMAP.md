# Roadmap

## v1.29 — Catalog foundation

- Unified portal and organization models
- Explicit dataset capabilities and access status
- Dataset schema discovery
- Conservative coverage metrics
- Bilingual glossary and query expansion
- Machine-readable trust manifest

## v1.30 — Data reliability and intelligence — complete

- Persisted connector-health history
- Dataset freshness and schema diff reporting
- Dataset-level license records
- Snapshot policy and record/schema diffs for permitted datasets
- Evidence-backed coverage, freshness and historical recipes
- Bilingual source browser and safe REST playground
- Typed TypeScript client

## v1.31 — Community connectors — complete

- Runtime connector plugin registry and capability discovery
- Write-gated custom sources with persistent configuration
- CSV, XLSX, SDMX and bounded SPARQL connectors
- Safe XLSX extraction budget and SPARQL update/SERVICE rejection
- Third verified live official source from MOHAP, reported as published

## v1.32 — Quality contract — complete

- Backwards-compatible quality metadata on every built-in live connector
- Completeness, sample coverage and source-trust classification
- Honest freshness, schema-stability and record-trend states
- Composite quality score without inventing unavailable history

## v1.33 — Universal read connectors — complete

- Socrata SODA connector with bounded paging and search
- Safe XML and RSS record extraction with external entities disabled
- Read-only GraphQL connector with configured documents and bounded variables
- SSRF validation on every redirect and HTTPS downgrade rejection

## v1.34 — Hybrid discovery — complete

- Field-weighted BM25 ranking across the official source catalog
- Arabic/English query normalization, glossary expansion and entity recognition
- Optional OpenAI-compatible embedding reranking with graceful lexical fallback
- Ranking evidence and matched terms returned with each source result

## v1.35 — UAE normalization and trends — complete

- Canonical bilingual aliases and codes for all seven emirates
- Stable cross-source entity keys without mutating source records
- Evidence-backed emirate comparison and snapshot trend recipes
- Polygon search exposed through REST and MCP
- Lineage on spatial, aggregate and intelligence-derived results

## v1.36 — Spatial intelligence — complete

- Nearest-feature ranking with calculated distances
- Bounded point-to-point spatial joins across two sources
- Parallel source retrieval, dual citations and transformation lineage
- REST and MCP access with strict sample, radius and match limits

## v1.37 — Vector map delivery — complete

- Standards-readable Mapbox Vector Tile encoding
- Dynamic per-source `{z}/{x}/{y}.pbf` endpoints
- TileJSON 3.0 metadata for MapLibre and compatible clients
- Bounded record input, safe property serialization and short public caching

## v1.40 — Deeper intelligence

- Cross-source entity resolution
- Indicators with methodology, lineage and limitations
- Additional distributed scheduling options for multi-replica deployments
- More live public connectors, prioritizing datasets with clear reuse licenses

## v2.0 — Government intelligence core

- Extract reusable `govmcp-core` contracts
- Plugin packages for connectors and country registries
- Signed build and trust provenance
- Generated Python, Go and Rust clients from stable REST contracts
