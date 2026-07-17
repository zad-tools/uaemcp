# Deployment

## Prebuilt multi-architecture image

The `publish-container` workflow builds the same Dockerfile for `linux/amd64`
and `linux/arm64`, publishes it to
`ghcr.io/ahmedvnabil/open-emirates-intelligence-mcp`, attaches an SBOM and
maximum-mode provenance, then runs the published amd64 image to verify its CLI
version. Use `compose.ghcr.yml` for a registry-backed self-host with a persistent
data volume and reduced container privileges.

For a public reverse proxy, explicitly set both trust boundaries:

```bash
UAEMCP_ALLOWED_HOSTS=uaemcp.example.com \
UAEMCP_ALLOWED_ORIGINS=https://uaemcp.example.com \
docker compose -f compose.ghcr.yml up -d
```

Do not expose a write token unless mutating source or snapshot operations are
required. Read tools remain available when writes are disabled.

## Bun process

```bash
bun install --frozen-lockfile
bun run check
bun src/index.ts doctor
UAEMCP_ALLOWED_HOSTS=data.example.ae bun src/index.ts http --host 127.0.0.1 --port 8080
```

Terminate TLS at a reverse proxy and use `deploy/nginx.conf` as the starting
point. Streamable HTTP at `/mcp` must not be buffered, cached or rewritten.

## Docker

```bash
docker compose up --build -d
curl --fail http://127.0.0.1:8080/readyz
```

Persist `/app/data` when snapshots or health history are enabled. Run one
snapshot scheduler per shared database; multi-replica leader election is not
built in. Keep `UAEMCP_WRITE_TOKEN` unset on a public read proxy unless write
operations are intentionally exposed behind authentication.

## Release gates

```bash
bun run check
bun run benchmark
bun pm pack --dry-run
docker build -t uaemcp:release .
```

Health checks prove the process is responsive, not that every external portal
is available. Use the dashboard or health-history endpoints for upstream state.
