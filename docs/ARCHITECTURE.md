# Architecture

UAEMCP has one Bun/TypeScript implementation and two public interfaces over the
same application services: MCP and REST. Connectors are the only modules allowed
to know upstream portal protocols.

```text
Clients -> Bun.serve -> MCP transport / REST router
                         -> application services
                            -> source registry
                            -> connector dispatch
                               -> SSRF-safe HTTP client
                                  -> official UAE portals
```

Every data result carries provenance. Public contracts are additive: tool names,
resource URIs, response envelopes, and REST v1 fields are compatibility surfaces.

## Unified catalog

The compatibility `Source` remains public, while the v0.3 catalog exposes the
clearer hierarchy `Organization -> Portal -> Dataset -> Resource`. Portal models
declare connector type, access status, capabilities, license verification status,
and official links. Dataset/resource objects are discovered lazily from upstream
catalogs so the registry never fabricates assets.

Schema discovery samples bounded live records and returns inferred field types,
nullability, uniqueness within the sample, examples, statistics, bilingual
semantic concepts, provenance, and inference lineage.

## Trust boundaries

- CLI arguments and environment variables are validated at startup.
- MCP and REST inputs are bounded before reaching services.
- Upstream URLs pass scheme, DNS, and IP-range checks.
- Upstream payloads are size-limited and treated as untrusted.
- Direct-contact fields are redacted before results leave connectors.
- Writes require a constant-time token comparison and are disabled by default.
- Public requests pass a bounded in-memory per-client rate limiter; distributed
  deployments should enforce a second shared limit at the gateway.
