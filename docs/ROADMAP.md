# Roadmap

The original transformation plan used milestones v0.3, v0.4, v0.5, v1.0 and
v2.0. This Bun rewrite began after the inherited package version, so the shipped
mapping is: v0.3 catalog → v1.29, v0.4 reliability → v1.30–1.33, v0.5 semantic
intelligence → v1.34–1.36, v1.0 production platform → v1.37–1.40. The long-term
reusable government core remains v2.0.

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

## v1.38 — Multi-language clients — complete

- OpenAPI 3.1 source contract with stable operation identifiers
- Generated Python, Go, Rust, Java and C# clients alongside TypeScript
- Per-language package manifests
- Staleness gate included in the main release check

## v1.39 — Explainable indicators — complete

- Four versioned indicators with formulas, evidence, limitations and citations
- Stored API-health and dataset-stability scoring with honest null states
- Bilingual normalized entity resolution across two bounded source samples
- Explicit field mappings, confidence and one-to-many output limits

## v1.40 — Complete developer platform — complete

- Bilingual responsive website with every required product section
- Live source registry, connector gallery, dataset browser and safe API workbench
- CLI help, version, doctor and bash/zsh/fish completion
- Runnable examples, connector and application templates, VS Code snippets
- Full API, deployment, recipes, FAQ, coding and threat-model documentation
- Reproducible local HTTP benchmark and release packaging gates

## v1.41 — Deeper intelligence — in progress

- Official FGIC National Gazetteer as a live bilingual geospatial connector
- Additional sector-specific indicators as queryable sources expand
- Additional distributed scheduling options for multi-replica deployments
- More live public connectors, prioritizing datasets with clear reuse licenses

## v2.0 — Government intelligence core

- Extract reusable `govmcp-core` contracts
- Plugin packages for connectors and country registries
- Signed build and trust provenance
- Independently published SDK packages after ecosystem demand is established

## Decision record for proposed work

| Proposal | Why / benefit | Risk | Migration | Performance impact | Security impact |
| --- | --- | --- | --- | --- | --- |
| More licensed live connectors | Queryable evidence, not portal counts, is the product moat | Authority schemas and terms change | Additive registry entries; no API break | More upstream fan-out; keep per-source budgets | Review license, key isolation and egress host |
| Shared scheduler coordination | Prevent duplicate snapshots across replicas | Adds operational dependency and leader failure modes | Keep current single-process default; add an optional coordinator | Removes duplicate work; coordinator adds a small lease call | Lease credentials require secret isolation |
| Extract `govmcp-core` | Reuse proven contracts for another country without cloning the server | Premature abstraction can weaken UAE-specific semantics | Preserve `uaemcp` as the compatibility facade | Neutral; packages may improve lazy loading | Trust manifests must identify registry and operator separately |
| Independent SDK packages | Native dependency management and discoverability | Six release pipelines can drift | Generate from the same OpenAPI contract and release together | No server impact | Signed provenance and token isolation per registry |
