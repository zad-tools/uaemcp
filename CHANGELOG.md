# Changelog

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
