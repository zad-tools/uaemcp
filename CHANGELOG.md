# Changelog

## 1.67.0

- Added UAE Policy Evidence Watch across five audited official legislation, resolution and announcement surfaces.
- Added `/policy-watch`, retained-state and bounded-check REST endpoints, `uae_policy_evidence_watch`, and a methodology resource.
- Persisted only SHA-256 fingerprints, short excerpts and check observations; full official pages are never mirrored.
- Distinguished first snapshot, unchanged, content changed and check failed without interpreting a page update as a legal or eligibility change.
- Added a daily hosted scheduler, strict allowlist, bilingual RTL Dubai Font interface and animated evidence-flow visual.

## 1.66.0

- Added UAE Evidence Studio to compose two to five existing official evidence pillars into one bilingual source-cited dossier.
- Added `/evidence-studio`, `POST /api/v1/evidence-dossier`, `uae_evidence_dossier` and `uae://evidence-studio/methodology`.
- Added parallel source loading with isolated unavailable states; missing evidence is never shown as zero.
- Preserved each fact's period, unit, scope, delivery mode, citation and limitations while disabling ranking, cross-evidence aggregation and composite scoring.
- Added local print, Markdown and JSON exports with no account, personal-data collection, generative model or server-side storage.
- Added an animated README workflow visual and a regression fix for the National Brief emirate selector.

## 1.65.0

- Added the UAE Health Facilities Atlas over 950 official MOHAP aggregate rows covering 2015–2024.
- Added year, emirate, sector, category and bilingual type search while preserving raw taxonomy and aggregate observation grain.
- Added `/health-facilities`, `/api/v1/health-facilities`, `uae_health_facilities_atlas` and `uae://health-facilities/methodology`.
- Added a SHA-256-identified verified snapshot fallback so upstream blocking never becomes a false zero.
- Explicitly excluded individual-location, bed, capacity, workforce, accessibility, quality and performance claims.
- Added a bilingual RTL Dubai Font interface and animated README evidence visual.

## 1.64.0

- Added the UAE National Evidence Brief across education, health, industry and FTA service activity.
- Preserved source-native periods, units, citations and limitations; cross-pillar aggregation and composite scoring are explicitly disabled.
- Added `/national-brief`, `/api/v1/national-brief`, the read-only `uae_national_evidence_brief` MCP tool and `uae://national-brief/methodology` resource.
- Added a bilingual RTL Dubai Font interface, animated README evidence visual and a practical MCP client setup guide.

## 1.63.0

- Added Ajman Urban Evidence over six official building, certified-rent, road-length and developed-crossroad datasets.
- Preserved every dataset and unit as a separate bounded annual observation instead of producing a misleading property or urban-growth composite.
- Added `/ajman-urban`, `/api/v1/ajman-urban` and the read-only `uae_ajman_urban_evidence` MCP tool with OpenAPI, SDK and trust-manifest discovery.
- Corrected source rows whose Arabic and English building-license labels are published in swapped fields.
- Added a bilingual RTL Dubai Font interface and animated README evidence diagram.

## 1.62.0

- Added the Ajman Business Evidence Explorer over three official OpenDataSoft licence views for activities, areas and published company status.
- Kept rankings and date observations isolated per dataset so records are never added together or presented as unique companies, market size, survival or growth.
- Added `/ajman-business`, `/api/v1/ajman-business` and the read-only `uae_ajman_business_evidence` MCP tool with OpenAPI, SDK and trust-manifest discovery.
- Preserved ISO source dates during PII redaction instead of mistaking date strings for telephone numbers.
- Added a bilingual RTL interface using same-origin Dubai Font and an animated evidence-boundary diagram for the README.

## 1.61.1

- Unified every public interface on same-origin Dubai Regular and Dubai Bold assets, removing direct third-party font requests from page markup.
- Restricted public page content-security policies to the trusted local font route and removed unused Google font imports.
- Added GET and HEAD font delivery contracts so browsers, reverse proxies and deployment probes observe the same production behavior.
- Reduced the npm release archive from 4.50 MB to about 200 KB by excluding README-only visual assets, with a release gate that verifies required runtime and documentation files remain present.
- Made the pre-release Bun quickstart truthful by installing the tested GitHub branch while npm `latest` remains on the earlier implementation, and documented the exact token-free Trusted Publisher handoff.
- Added a complete open-source contribution surface: conduct and support policies, structured bug/source/connector forms, a trust-focused pull-request checklist, repository labels and private vulnerability reporting.
- Added Bun-native Dependabot updates, weekly CodeQL analysis, least-privilege CI permissions and a mandatory dependency audit in every local and hosted release check.
- Removed CodeQL-identified ReDoS and incomplete-sanitization paths from URL assembly, ODS search, XML/RSS parsing and SPARQL validation; browser-script tests now use a deterministic HTML scanner.
- Updated the Bun runtime and types to 1.3.14, TypeScript to 7.0.2, `ipaddr.js` to 2.4.0 and the verified GitHub Actions toolchain to current supported majors.

## 1.61.0

- Promoted the official FGIC National Gazetteer from a generic source query to the dedicated `/api/v1/places` evidence product and `uae_place_names` MCP tool.
- Normalized Arabic and English names, source-native categories and valid coordinates while deliberately excluding FGIC's known placeholder English-description field.
- Rebuilt the Place Names Explorer around the stable product contract with complete Arabic runtime states, responsive RTL and locally served Dubai Font.
- Added OpenAPI and generated SDK support, strict query budgets, provenance, lineage, explicit map limitations and an animated README visual.

## 1.60.0

- Expanded the UAE Founder Pathway into a source-linked Action Dossier with ordered setup, support and entrepreneur-residency tasks.
- Every server-produced task starts as `not_started`; completion checks remain only in browser memory and are never sent back or stored.
- Added activity-sector routing, live progress, a dedicated print layout and local JSON export with official links and bilingual task evidence.
- Strengthened the founder interface with output escaping, HTTPS link validation, Dubai Font and responsive Arabic RTL behavior.

## 1.59.0

- Added the UAE Founder Pathway as an ordered journey across official business setup, relevant government-backed startup support and entrepreneur Golden Residency readiness.
- Added strict non-identifying inputs, planning-only output and explicit separation from licensing, programme acceptance and residency eligibility.
- Added `/founder-pathway`, `POST /api/v1/founder-pathway`, the read-only `uae_founder_pathway` MCP tool, OpenAPI/SDK integration and trust-manifest discovery.
- Added a bilingual RTL Dubai Font interface and animated README journey.
- Increased the public registry to 12 products and 30 MCP tools.

## 1.58.0

- Added the UAE Startup Support Navigator across nine official or government-backed programmes from MBRIF, EDB, Hub71, Dubai SME, Sheraa, Ruwad and Ajman DED.
- Added privacy-bounded matching by startup stage, support need and emirate without collecting names, contact details, pitch decks, financial records or passport data.
- Added `/startup-support`, REST catalogue and matching routes, the read-only `uae_startup_support` MCP tool, OpenAPI/SDK integration and trust-manifest discovery.
- Added bilingual RTL presentation using locally served Dubai Regular and Dubai Bold, plus an animated README product diagram.
- Increased the public registry to 11 products and 29 MCP tools.

## 1.57.0

- Added the UAE Business Setup Navigator with official mainland routing across all seven emirates and federal free-zone guidance.
- Kept setup routing non-identifying and explicitly avoided licence, fee, package or approval claims.

## 1.56.0

- Routes Dubai and Abu Dhabi dossiers to the published official category page for investors, entrepreneurs, talents, specialists and students.
- Keeps the authority hub as an honest fallback when a distinct issuance page is not confirmed, avoiding renewal-only or inferred links.
- Adds `categorySpecific` to routing output so agents can explain whether the next step is a precise category page or an authority hub.
- Verified the direct student flow in Arabic, RTL and Dubai Font without mobile overflow.

## 1.55.0

- Distinguishes the federal baseline assessment from Dubai and Abu Dhabi local category criteria instead of implying that one threshold set is universal.
- Adds a bilingual local-criteria warning directly inside every routed Evidence Dossier.
- Adds GDRFA Dubai and Abu Dhabi Residents Office pages to the dated official evidence catalogue.
- Locks the readiness action until the catalogue has loaded, preventing late network responses from clearing user-entered evidence.

## 1.54.0

- Added a non-identifying application-jurisdiction choice to Golden Residency assessments.
- Routes the official next step to ICP, GDRFA Dubai or the Abu Dhabi Residents Office instead of sending every applicant to one federal page.
- Verified the current official Golden Residency hubs and retained government-only, no-intermediary guidance.
- Kept the new jurisdiction flow bilingual, mobile-safe and set in Dubai Font.

## 1.53.0

- Expanded the Golden Residency Navigator from broad pathway families to 14 practical official routes, including doctors, scientists, inventors, creatives, executives, athletes and priority specialists.
- Added authority-specific matched and missing evidence with a privacy-bounded dossier completion summary.
- Added printable and JSON-downloadable Evidence Dossiers without collecting or retaining names, passport numbers or contact details.
- Kept the complete bilingual result responsive after language switching and applied Dubai Font to the interface and print output.

## 1.52.0

- Added the UAE Golden Residency Navigator using current ICP and u.ae pathway requirements verified on 17 July 2026.
- Added a privacy-bounded readiness assessment that accepts no names, passport numbers, contact details or unknown fields and never claims eligibility or guarantees approval.
- Added `/golden-residency`, `GET /api/v1/golden-residency`, `POST /api/v1/golden-residency/assess`, and the read-only `uae_golden_residency` MCP tool.
- Added bilingual RTL presentation using Dubai Font, official authority routing, anti-intermediary warnings, OpenAPI/SDK integration and a dated metadata source.
- Increased the honest registry to 40 indexed official sources and 27 MCP tools while keeping the live-connector count at eight.

## 1.51.0

- Added the UAE Education Ledger with FCSC-accredited 2023/2024 national student and educational-personnel totals, explicit female/male reconciliation, and bounded derived ratios.
- Added the separate seven-resource Ministry of Education 2018–2024 catalogue without merging incompatible evidence scopes or claiming legacy downloads are live.
- Added `/education`, `GET /api/v1/education`, `uae_education_ledger`, OpenAPI and product-registry integration, a SHA-256 identified official-report snapshot, bilingual RTL presentation, and a real README screenshot.
- Increased the honest registry to 39 indexed official sources while keeping the live-connector count at eight.

## 1.50.0

- Adopted Dubai Font across every public interface in English and Arabic, including RTL-specific typography and matching content-security policies.
- Completed Arabic methodology, limitation, snapshot-fallback, search-label, loading and error copy for the Health Indicators ledger.
- Added a regression contract that covers typography and font loading policy across all eight public interface routes.

## 1.49.0

- Added the official MOHAP Health Core Indicators workbook as the eighth live connector, preserving all source-native values and the visible 2016–2023 series.
- Added the bilingual `/health-indicators` evidence ledger, `GET /api/v1/health-indicators`, and the `uae_health_indicators` MCP tool with explicit methodology, limits, provenance, and bounded search.
- Added a SHA-256 identified retained snapshot fallback because the official MOHAP host can reject cloud-server connections; responses declare live versus snapshot delivery.
- Adopted Dubai Font for the new health product, the public gateway, and the tax-service evidence product.

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
