# Open Emirates Intelligence

Official UAE open data over the Model Context Protocol, running on Bun.

Maintained by **Ahmed Morsy**. Released under the MIT license and built on the
original open-source UAEMCP work credited in [LICENSE](LICENSE).

The server keeps the public `uaemcp` contract and extends it to 18 source-cited
MCP tools, six resources, three prompts, bilingual catalog search, CKAN,
OpenDataSoft, ArcGIS, Socrata, JSON, CSV, XLSX, XML, RSS, GraphQL, SDMX and
SPARQL connectors, geo queries,
aggregation, PII redaction, SSRF protection, and
health/readiness/Prometheus endpoints. Bun SQLite stores health history and
bounded dataset snapshots for repeatable comparisons.

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
| `uae_sources_list` | List the 33 registered official sources |
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
| `uae_source_aggregate` | Group and aggregate records |
| `uae_market_snapshot` | Build a source-backed market snapshot |
| `uae_dashboard_summary` | Summarize source health concurrently |
| `uae_dataset_snapshot` | Create, list and compare historical snapshots |
| `uae_intelligence_recipe` | Run coverage, freshness, history, emirate-comparison and trend recipes |
| `uae_source_add_metadata` | Add metadata with a write token |
| `uae_source_add` | Register a custom source for any installed connector (write token required) |

## Unified catalog and coverage

The project does not present every indexed portal as live data. Use:

- `GET /api/v1/coverage` for live, blocked, key-required and metadata-only totals.
- `GET /api/v1/catalog` for explicit portal, organization, connector, license and capability models.
- `GET /.well-known/uaemcp.json` for the operator and trust manifest.
- `GET /api/v1/sources/{sourceId}/schema` or `uae_dataset_schema` before aggregation.
- `GET /api/v1/sources/{sourceId}/health-history` for uptime and latency history.
- `GET|POST /api/v1/sources/{sourceId}/snapshots` and `GET /api/v1/snapshots/diff` for dataset history.
- `GET /api/v1/intelligence/recipes` to discover analytical recipes and run them by id.

Current conservative coverage is 33 official sources indexed, 3 live record
connectors, 1 blocked connector, and 3 key-required portals. Counts never imply
that metadata-only portals are queryable.

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
