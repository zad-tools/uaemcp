<p align="center">
  <img src="docs/assets/readme-hero.svg" alt="Open Emirates Intelligence — animated federation data map" width="100%">
</p>

<h1 align="center">Open Emirates Intelligence</h1>

<p align="center"><strong>The Emirates, queryable.</strong></p>

<p align="center">
  <a href="https://uaemcp.zad.tools"><img src="https://img.shields.io/badge/LIVE-uaemcp.zad.tools-087443?style=flat-square" alt="Live instance"></a>
  <a href="https://github.com/ahmedvnabil/Open-Emirates-Intelligence-MCP/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ahmedvnabil/Open-Emirates-Intelligence-MCP/ci.yml?style=flat-square&label=CI" alt="CI status"></a>
  <img src="https://img.shields.io/badge/runtime-Bun-f1eddf?style=flat-square&logo=bun&logoColor=13251d" alt="Bun runtime">
  <img src="https://img.shields.io/badge/license-MIT-c34032?style=flat-square" alt="MIT license">
</p>

<p align="center">Official UAE open data for agents, researchers and builders—over MCP, REST, vector maps and six SDKs.</p>

<p align="center">
  <img src="docs/assets/oei-motion.gif" alt="Animated Open Emirates Intelligence product preview" width="760">
</p>

<p align="center">
  <img src="docs/assets/brand-system.svg" alt="Open Emirates Intelligence brand identity system" width="100%">
</p>

<table>
  <tr>
    <td width="68%"><img src="docs/assets/screenshots/landing-desktop.jpg" alt="Desktop landing page"></td>
    <td width="32%"><img src="docs/assets/screenshots/landing-mobile.png" alt="Mobile landing page"></td>
  </tr>
</table>

<p align="center">
  <img src="docs/assets/screenshots/product-registry.jpg" alt="Bilingual public product registry with evidence scope and limitations" width="100%">
</p>

<p align="center">
  <img src="docs/assets/screenshots/landing-arabic.jpg" alt="Arabic RTL Open Emirates Intelligence gateway" width="100%">
</p>

Maintained by **Ahmed Morsy**. Released under the MIT license and built on the
original open-source UAEMCP work credited in [LICENSE](LICENSE).

The server keeps the public `uaemcp` contract and extends it to 28 source-cited
MCP tools, nine resources, three prompts, bilingual catalog search, CKAN,
OpenDataSoft, ArcGIS, Socrata, JSON, CSV, XLSX, XML, RSS, GraphQL, SDMX and
SPARQL connectors, geo queries,
aggregation, PII redaction, SSRF protection, and
health/readiness/Prometheus endpoints. Bun SQLite stores health history and
bounded dataset snapshots for repeatable comparisons.

The public gateway is fully bilingual: navigation, product evidence, catalog,
connectors, dataset discovery, playground controls and runtime states switch
between English and Arabic. Every public application uses Dubai Font with native
RTL composition.

<p align="center">
  <a href="https://uaemcp.zad.tools/business-setup"><img src="docs/assets/business-routing.svg" alt="Animated UAE Business Setup Navigator routing across seven emirates" width="100%"></a>
</p>

The **UAE Business Setup Navigator** routes founders to the competent official
mainland authority or federal free-zone directory across all seven emirates. It
does not collect names, phone numbers, emails or passport data, and never
pretends to choose a licence, calculate final fees or guarantee approval.

## Hosted endpoint

```json
{
  "mcpServers": {
    "uae-intelligence": {
      "type": "http",
      "url": "https://uaemcp.zad.tools/mcp"
    }
  }
}
```

## Run with Bun

Requires Bun 1.3 or newer.

```bash
bun install
bun src/index.ts stdio
```

The installed CLI also provides deployment diagnostics and shell completion:

```bash
uaemcp doctor
source <(uaemcp completion zsh)
uaemcp --help
```

For Streamable HTTP:

```bash
bun src/index.ts http --host 0.0.0.0 --port 8080
```

Endpoints:

- MCP: `POST /mcp`
- Liveness: `GET /health` or `/healthz`
- Readiness: `GET /ready` or `/readyz`
- Prometheus metrics: `GET /metrics`
- REST API: `GET /api/v1/sources`, `/api/v1/search`, and source capability routes
- Vector maps: `GET /api/v1/sources/{sourceId}/tilejson` and `/tiles/{z}/{x}/{y}.pbf`
- Public Observatory: `GET /observatory` — source reliability, incidents and evidence reports
- UAE Industry Atlas: `GET /industry-atlas` — bounded industrial-establishment evidence by emirate, area and product label
- UAE Trade Flow Radar: `GET /trade-flow` — bounded Ajman 2023 certificate-of-origin evidence by destination, transport, product code and origin
- UAE Tax Service Activity: `GET /tax-services` — official FTA 2025 service-activity totals and quarterly evidence, explicitly not revenue or taxpayer counts
- FTA Archive Explorer: `GET /tax-services/archive` — source-native 2017–2022, 2024 and 2025 workbooks with comparison disabled when scopes are incompatible
- UAE Place Names Explorer: `GET /places` — bilingual official place-name search and mapped FGIC evidence
- UAE Health Indicators: `GET /health-indicators` — 111 official MOHAP indicator rows with source-native 2016–2023 series and explicit scale limitations
- UAE Education Ledger: `GET /education` — FCSC-accredited 2023/2024 national totals, reconciliation checks and the separate seven-resource Ministry of Education catalogue
- UAE Golden Residency Navigator: `GET /golden-residency` — 14 official routes with direct category pages at ICP/GDRFA/ADRO, federal-vs-local criteria warnings and a printable non-identifying readiness dossier

<p align="center">
  <a href="https://uaemcp.zad.tools/golden-residency"><img src="docs/assets/golden-routing.svg" alt="Animated privacy-first Golden Residency routing to ICP, GDRFA Dubai and Abu Dhabi Residents Office" width="920"></a>
</p>
- Industrial Change Monitor: `GET /api/v1/industry-atlas/change` — compares the two latest different retained samples; unchanged checks are deduplicated and sample movement is never described as economic growth

<table>
  <tr>
    <td width="68%"><a href="https://uaemcp.zad.tools/golden-residency"><img src="docs/assets/screenshots/golden-residency.jpg" alt="UAE Golden Residency Navigator official pathway dossier"></a></td>
    <td width="32%"><a href="https://uaemcp.zad.tools/golden-residency"><img src="docs/assets/screenshots/golden-residency-mobile.png" alt="UAE Golden Residency Navigator mobile interface using Dubai Font"></a></td>
  </tr>
</table>

<p align="center">
  <a href="https://uaemcp.zad.tools/education"><img src="docs/assets/screenshots/education-ledger.png" alt="UAE Education Ledger with accredited FCSC totals and Ministry of Education resource catalogue" width="100%"></a>
</p>

<p align="center">
  <a href="https://uaemcp.zad.tools/health-indicators"><img src="docs/assets/screenshots/health-indicators.jpg" alt="UAE Health Indicators evidence ledger using Dubai Font" width="100%"></a>
</p>

<p align="center">
  <a href="https://uaemcp.zad.tools/observatory"><img src="docs/assets/screenshots/observatory.png" alt="Emirates Open Data Observatory" width="100%"></a>
</p>

<p align="center">
  <a href="https://uaemcp.zad.tools/industry-atlas"><img src="docs/assets/screenshots/industry-atlas.png" alt="UAE Industry Atlas" width="100%"></a>
</p>

<table>
  <tr>
    <td width="55%"><a href="https://uaemcp.zad.tools/trade-flow"><img src="docs/assets/screenshots/trade-flow-radar.jpg" alt="UAE Trade Flow Radar"></a></td>
    <td width="45%"><a href="https://uaemcp.zad.tools/trade-flow"><img src="docs/assets/screenshots/trade-flow-data.jpg" alt="UAE Trade Flow Radar data view"></a></td>
  </tr>
</table>

<p align="center">
  <a href="https://uaemcp.zad.tools/tax-services"><img src="docs/assets/screenshots/tax-service-activity.png" alt="UAE Tax Service Activity 2025" width="100%"></a>
</p>

<table>
  <tr>
    <td width="58%"><a href="https://uaemcp.zad.tools/tax-services/archive"><img src="docs/assets/screenshots/fta-archive-explorer.jpg" alt="FTA Archive Explorer hero"></a></td>
    <td width="42%"><a href="https://uaemcp.zad.tools/tax-services/archive"><img src="docs/assets/screenshots/fta-archive-data.jpg" alt="FTA Archive Explorer source-native data view"></a></td>
  </tr>
</table>

<p align="center">
  <a href="https://uaemcp.zad.tools/places"><img src="docs/assets/screenshots/place-names.png" alt="UAE Place Names Explorer" width="100%"></a>
</p>

## MCP client configuration

```json
{
  "mcpServers": {
    "uae-intelligence": {
      "command": "bun",
      "args": ["/absolute/path/to/uaemcp/src/index.ts", "stdio"]
    }
  }
}
```

## TypeScript SDK

The same Bun package includes a zero-dependency typed REST client:

```ts
import { UaemcpClient } from "uaemcp";

const uae = new UaemcpClient();
const matches = await uae.search("عقارات دبي", { deep: true });
const records = await uae.records("moiat_industrial_licenses", { limit: 10 });
```

Point `baseUrl` at the hosted endpoint or any self-hosted instance. Structured
API failures throw `UaemcpClientError` with the HTTP status and public error code.

## Generated SDKs

The repository also ships generated clients for Python, Go, Rust, Java and C#
under [`sdk/`](sdk/). All clients are generated from the live OpenAPI 3.1
contract at `/openapi.json`:

```bash
bun run generate:sdks
bun run check:sdks
```

The second command fails when an API change has not been propagated to every
language. It is included in the main release check.

## Tools

| Tool | Purpose |
| --- | --- |
| `uae_education_ledger` | Read the accredited 2023/2024 national education snapshot and separate Ministry resource catalogue with reconciliation and source SHA-256 |
| `uae_golden_residency` | Explore official Golden Residency pathways or assess non-identifying evidence readiness without determining eligibility |
| `uae_products_list` | Discover all public evidence products with bilingual scope, routes and limitations |
| `uae_sources_list` | List the 40 registered official sources |
| `uae_source_get` | Read source metadata |
| `uae_source_health` | Probe one source |
| `uae_source_datasets` | Discover portal datasets |
| `uae_source_records` | Fetch redacted, cited records |
| `uae_dataset_schema` | Infer fields, types, examples and semantic meaning |
| `uae_search` | Search the bilingual catalog |
| `uae_source_geo` | Return spatially filtered GeoJSON |
| `uae_spatial_join` | Join two bounded point datasets by radius |
| `uae_indicator` | List or calculate explainable national-data indicators |
| `uae_entity_resolve` | Resolve normalized entities across two bounded sources |
| `uae_observatory` | Read national reliability, incidents and source profiles |
| `uae_industry_atlas` | Build a bounded industrial evidence slice (`action=atlas`) or read the honest Change Monitor (`action=change`) |
| `uae_tax_service_activity` | Read the official FTA 2025 service-activity report with methodology and explicit non-revenue limits |
| `uae_tax_service_archive` | Read the source-native FTA 2017–2022, 2024 and 2025 workbooks without unsafe cross-year comparison |
| `uae_trade_flow_radar` | Analyze bounded Ajman export and re-export certificate records without presenting counts as trade value |
| `uae_health_indicators` | Search official MOHAP health indicators while preserving the workbook's published values and limits |
| `uae_source_aggregate` | Group and aggregate records |
| `uae_market_snapshot` | Build a source-backed market snapshot |
| `uae_dashboard_summary` | Summarize source health concurrently |
| `uae_dataset_snapshot` | Create, list and compare historical snapshots |
| `uae_intelligence_recipe` | Run coverage, freshness, history, emirate-comparison and trend recipes |
| `uae_source_add_metadata` | Add metadata with a write token |
| `uae_source_add` | Register a custom source for any installed connector (write token required) |

FTA archive REST mirror: `GET /api/v1/tax-services/archive`. It returns the
2017–2022 selected-services table, the source-native 2024 monthly table, and the
2025 quarterly table as separate cited views. `comparison.status` is
`unavailable`: 2023 is missing and the published scopes and schemas are not
equivalent, so UAEMCP does not manufacture a trend or annual total.

## Unified catalog and coverage

The project does not present every indexed portal as live data. Use:

- `GET /api/v1/coverage` for live, blocked, key-required and metadata-only totals.
- `GET /api/v1/catalog` for explicit portal, organization, connector, license and capability models.
- `GET /.well-known/uaemcp.json` for the operator and trust manifest.
- `GET /api/v1/sources/{sourceId}/schema` or `uae_dataset_schema` before aggregation.
- `GET /api/v1/sources/{sourceId}/health-history` for uptime and latency history.
- `GET|POST /api/v1/sources/{sourceId}/snapshots` and `GET /api/v1/snapshots/diff` for dataset history.
- `GET /api/v1/intelligence/recipes` to discover analytical recipes and run them by id.

Current conservative coverage is 40 official sources indexed, 8 live record
connectors, 1 blocked connector, and 3 key-required portals. Counts never imply
that metadata-only portals are queryable.

One live connector is the official FGIC National Gazetteer. It exposes
bilingual UAE place names and coordinates through ArcGIS while omitting a known
placeholder English-description field and retaining FGIC's informational-use disclaimer:

```bash
curl 'https://uaemcp.zad.tools/api/v1/sources/fgic_national_gazetteer/records?query=%D8%AF%D8%A8%D9%8A&limit=5'
```

Tool results use `{ ok, data, error, meta }`. Data responses include source,
license, citation, fetch time, completeness, sample coverage, source trust,
freshness, schema stability, record-count trend and a composite quality score.
Unknown measurements stay explicitly `unknown` until history can prove them.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `UAEMCP_HOST` | `127.0.0.1` | HTTP bind host |
| `UAEMCP_PORT` | `8080` | HTTP port |
| `UAEMCP_WRITE_TOKEN` | unset | Enables the write tool |
| `UAEMCP_HTTP_TIMEOUT` | `8` | Upstream timeout in seconds |
| `UAEMCP_HEALTH_TIMEOUT` | `5` | Health timeout in seconds |
| `UAEMCP_CACHE_TTL` | `300` | Dashboard cache TTL in seconds |
| `UAEMCP_MAX_RESPONSE_BYTES` | `5242880` | Maximum upstream response size |
| `UAEMCP_ALLOW_PRIVATE_HOSTS` | `false` | Allow private upstream hosts |
| `UAEMCP_ALLOWED_HOSTS` | unset | Comma-separated public host allowlist |
| `UAEMCP_ALLOWED_ORIGINS` | unset | Browser origin allowlist; use `*` only for fully public reads |
| `UAEMCP_RATE_LIMIT_PER_MINUTE` | `120` | Per-client public request limit; `0` disables it |
| `UAEMCP_DATABASE_PATH` | `data/uaemcp.sqlite` | Durable health-history and snapshot database |
| `UAEMCP_HEALTH_RETENTION` | `10000` | Maximum stored health checks per source |
| `UAEMCP_HEALTH_SCAN_INTERVAL_MINUTES` | `0` | Periodic Observatory scan; hosted deployment uses `60` |
| `UAEMCP_SNAPSHOT_RETENTION` | `30` | Maximum changed snapshots per source/dataset |
| `UAEMCP_SNAPSHOT_INTERVAL_MINUTES` | `0` | Snapshot schedule; `0` disables it |
| `UAEMCP_SNAPSHOT_TARGETS` | unset | Comma-separated `source` or `source@dataset` targets |
| `UAEMCP_SNAPSHOT_LIMIT` | `100` | Records captured per scheduled target |
| `UAEMCP_EMBEDDING_ENDPOINT` | unset | Optional OpenAI-compatible `/embeddings` endpoint for hybrid reranking |
| `UAEMCP_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model sent to that endpoint |
| `UAEMCP_EMBEDDING_API_KEY` | unset | Optional bearer token for the embedding endpoint |

The scheduler starts with the HTTP server, runs immediately and then at the
configured interval. Identical payloads are deduplicated. Inspect its state at
`GET /api/v1/operations/snapshot-scheduler`.

## Hosted public proxy

The same server can be offered as a public MCP endpoint for users who cannot
self-host. Put it behind Nginx using [`deploy/nginx.conf`](deploy/nginx.conf),
set the public host/origin allowlists, keep write tools disabled, and expose:

```text
https://your-domain.example/mcp
```

The Nginx configuration disables buffering, caching, and compression on `/mcp`
so Streamable HTTP responses are not delayed or rewritten.

## Verify

```bash
bun run check
bun run benchmark
docker compose up --build
```

MIT licensed. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
Connector authors should start with [docs/CONNECTORS.md](docs/CONNECTORS.md).
See [docs/API.md](docs/API.md), [docs/RECIPES.md](docs/RECIPES.md),
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/FAQ.md](docs/FAQ.md), and the
[runnable examples](examples/README.md) for the complete developer path.
The security review is in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md), and the
evidence-backed release audit is in [docs/COMPLETENESS.md](docs/COMPLETENESS.md).
The requirement-by-requirement status is tracked in [docs/COMPLETENESS.md](docs/COMPLETENESS.md).
