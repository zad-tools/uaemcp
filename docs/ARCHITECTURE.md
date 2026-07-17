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

## Trust boundaries

- CLI arguments and environment variables are validated at startup.
- MCP and REST inputs are bounded before reaching services.
- Upstream URLs pass scheme, DNS, and IP-range checks.
- Upstream payloads are size-limited and treated as untrusted.
- Direct-contact fields are redacted before results leave connectors.
- Writes require a constant-time token comparison and are disabled by default.
