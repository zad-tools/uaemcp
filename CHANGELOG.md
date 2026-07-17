# Changelog

## 1.48.0

- Completed Arabic localization across the landing-page navigation, proof metrics, workflow, catalog, connectors, dataset explorer, playground, community and runtime states.
- Localized dynamic access labels, connector summaries, dataset results, validation messages and partial-failure states while preserving technical identifiers.
- Kept product and source registries failure-isolated and added a browser-script and bilingual contract regression suite.

## 1.47.0

- Added a public bilingual registry for all six evidence products with explicit scope and limitations.
- Added `GET /api/v1/products`, `uae_products_list`, `uae://products` and the generated OpenAPI contract.
- Turned the homepage into a product gateway with a live editorial product ledger and direct Trade Flow Radar discovery.

## 1.46.0

- Added `uae_trade_flow_radar` over four official Ajman 2023 certificate-of-origin datasets.
- Added `/api/v1/trade-flow` with separate export and re-export rankings, per-flow sample coverage, per-dataset license/quality/lineage, citations, methodology and limitations.
- Added the bilingual `/trade-flow` evidence explorer and real README screenshots.
- Added a shared configured-TTL product cache so public REST and MCP traffic does not repeat the four-dataset upstream fan-out.

## 1.43.0

- Added `uae_tax_service_activity` as a first-class MCP tool backed by the same bounded official FTA report as the REST product.
- Added an injectable public runtime seam so MCP and REST contract tests remain deterministic without depending on upstream availability.
- Declared the tax product and MCP tool in the machine-readable trust manifest.

## 1.42.0

- Added the official FTA 2025 service-activity workbook as a bounded live XLSX source.
- Added `/tax-services` and `/api/v1/tax-services`, with bilingual presentation, official totals, methodology, and explicit non-revenue limitations.
- Added source-declared XLSX row boundaries so unrelated embedded tables cannot leak into a dataset.

## 1.41.0

- Add the official FGIC National Gazetteer as a live bilingual ArcGIS source.
- Exclude its known placeholder English-description field while retaining the
  source-published names, Arabic descriptions, categories and coordinates.
- Increase conservative coverage to 34 indexed official sources and four live
  record connectors without treating metadata-only portals as queryable.
- Add the responsive bilingual UAE Place Names Explorer at `/places` with live
  search, mapped results, citations and explicit FGIC limitations.

## 1.40.0

- Complete bilingual product website with live catalog, dataset browser and API workbench.
- Add CLI diagnostics and bash, zsh and fish completion.
- Add runnable examples, connector/application templates and VS Code snippets.
- Add reproducible local benchmark and complete API, recipe, deployment, FAQ,
  coding-standard, threat-model and requirement-audit documentation.
- Fix the landing-page script syntax caught by real browser verification.

## 1.39.0

- Add explainable indicators and bilingual cross-source entity resolution.
