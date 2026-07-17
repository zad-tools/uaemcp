# Open Emirates Intelligence

Official UAE open data over the Model Context Protocol, running on Bun.

Maintained by **Ahmed Morsy**. Released under the MIT license and built on the
original open-source UAEMCP work credited in [LICENSE](LICENSE).

The server keeps the public `uaemcp` contract: 11 source-cited MCP tools, three
resources, three prompts, bilingual catalog search, CKAN/OpenDataSoft/ArcGIS/JSON
connectors, geo queries, aggregation, PII redaction, SSRF protection, and
health/readiness/Prometheus endpoints.

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

## Tools

| Tool | Purpose |
| --- | --- |
| `uae_sources_list` | List the 32 registered official sources |
| `uae_source_get` | Read source metadata |
| `uae_source_health` | Probe one source |
| `uae_source_datasets` | Discover portal datasets |
| `uae_source_records` | Fetch redacted, cited records |
| `uae_search` | Search the bilingual catalog |
| `uae_source_geo` | Return spatially filtered GeoJSON |
| `uae_source_aggregate` | Group and aggregate records |
| `uae_market_snapshot` | Build a source-backed market snapshot |
| `uae_dashboard_summary` | Summarize source health concurrently |
| `uae_source_add_metadata` | Add metadata with a write token |

Tool results use `{ ok, data, error, meta }`. Data responses include source,
license, citation, fetch time, and quality metadata.

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
docker compose up --build
```

MIT licensed. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
