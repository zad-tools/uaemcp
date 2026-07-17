# Threat model

The server accepts public MCP/REST input and makes outbound requests to official
or operator-registered endpoints. Upstream data, URLs, headers and clients are
untrusted. The SQLite store and deployment environment are trusted operator
boundaries.

| Threat | Control | Residual risk / deployment action |
| --- | --- | --- |
| SSRF and cloud metadata access | HTTP(S)-only URL parser, DNS/IP classification, private/reserved/mapped-address blocking | Enforce outbound firewall allowlists for a high-risk public deployment |
| DNS rebinding / TOCTOU | Validate every initial and redirect URL and all resolved IPs | Runtime fetch resolves again; network egress policy is the final containment layer |
| Redirect abuse | Manual redirects, five-hop limit, validation per hop, HTTPS downgrade rejection | Official portals may legitimately redirect and require registry correction |
| Header injection | Server-controlled upstream headers; callers cannot supply arbitrary connector headers | Operator-configured GraphQL headers must remain secret-managed |
| Path traversal | REST routes use URL segments, identifiers and explicit file paths; no request path reaches filesystem reads | Protect the configured SQLite directory with OS permissions |
| Token leakage | Constant-time write-token check, no token in responses, writes off by default | Reverse proxies must redact authorization headers from logs |
| API abuse | Bounded inputs, response budgets, timeouts and per-client rate limit | Use a shared gateway quota for multiple replicas |
| Dataset permissions | Public reads only for registered public sources; mutations require write token | Operators must verify every dataset license and API-key terms |
| Decompression bombs | XLSX central-directory and output-size budgets | Keep dependency patches current |
| XML entity expansion | DOCTYPE/entity declarations rejected | Non-XML source formats remain separately validated |
| GraphQL/SPARQL mutation | Configured GraphQL read documents only; SPARQL SELECT only; SERVICE rejected | Operator is responsible for the configured endpoint and query |
| PII redistribution | Field-name and value-pattern contact redaction before output | Classification can over-redact public business contacts; public proxy stays strict |
| Cache poisoning | Registry-based connectors, no-store API responses where stateful, source citations | Reverse proxies should not cache MCP sessions |
| Supply chain | Exact dependency versions, lockfile, SDK staleness and release checks | Enable repository dependency alerts and signed release provenance |

Security verification lives in `test/ssrf.test.ts`, `test/http-client.test.ts`,
`test/auth.test.ts`, `test/rate-limit.test.ts`, `test/redaction.test.ts`, and the
format-specific connector tests. Vulnerability reporting is defined in
`SECURITY.md`.
