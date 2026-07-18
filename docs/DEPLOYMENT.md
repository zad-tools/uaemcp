# Deployment

## Prebuilt multi-architecture image

The `publish-container` workflow builds the same Dockerfile for `linux/amd64`
and `linux/arm64`, publishes it to
`ghcr.io/zad-tools/uaemcp`, attaches an SBOM and
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

`bun run check` starts with `bun audit` and fails on known dependency
vulnerabilities. It also includes a registry-package audit: README-only visual
assets must stay outside the tarball, required runtime files must be present,
and the packed archive must remain below 1 MB.

## One-time npm Trusted Publisher setup

The `publish-npm.yml` workflow already uses a GitHub-hosted runner with
`id-token: write`; it deliberately has no long-lived npm token. Before creating
the next `v*` release tag, the `uaemcp` package owner must open the package settings
on npm and add this GitHub Actions trusted publisher:

| Field | Value |
|---|---|
| Organization or user | `ahmedvnabil` |
| Repository | `Open-Emirates-Intelligence-MCP` |
| Workflow filename | `publish-npm.yml` |
| Environment | Leave empty |
| Allowed action | `npm publish` |

The filename includes the extension and is intentionally not the full
`.github/workflows/` path. npm validates this relationship only when the
workflow attempts to publish, so recheck capitalization before tagging.

After the publisher is saved, create the release tag only from a clean,
verified `main` commit:

```bash
test "$(git branch --show-current)" = main
test -z "$(git status --porcelain)"
bun run check
VERSION=1.83.0
git tag -s "v$VERSION" -m "Open Emirates Intelligence v$VERSION"
git push origin "v$VERSION"
```

That tag publishes the exact tested tarball with provenance and creates the
matching GitHub Release. Do not create the tag before the trusted publisher is
saved: npm `latest` currently points to the earlier implementation.

Health checks prove the process is responsive, not that every external portal
is available. Use the dashboard or health-history endpoints for upstream state.
