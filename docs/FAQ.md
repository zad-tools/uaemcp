# FAQ

## Is every indexed source queryable?

No. Coverage labels distinguish live records, API-key requirements, blocked
services and metadata-only portals. `/api/v1/coverage` is the authoritative view.

## Can I offer it as a public proxy?

Yes. Set Host and Origin allowlists, leave writes disabled, apply rate limits,
terminate TLS at a reverse proxy and monitor upstream quotas.

## Does it run on Node.js?

The server intentionally targets Bun 1.3+. The generated REST SDKs work in their
respective language runtimes; the TypeScript client uses standard `fetch`.

## Are results official government statements?

No. Raw records cite official sources. Aggregations and indicators are derived
outputs whose methodology and limitations are included in the response.

## Why are contacts redacted?

The public default removes phone and email values to prevent bulk redistribution
of direct-contact data. Self-hosters can adapt the policy after reviewing source
terms and applicable law.

## How do I add a portal?

Use a built-in connector through the authenticated source-registration API, or
register a connector plugin following `docs/CONNECTORS.md`. Every upstream fetch
must be bounded, SSRF-guarded, redacted and source-cited.
