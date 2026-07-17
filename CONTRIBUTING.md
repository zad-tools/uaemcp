# Contributing

UAEMCP is a Bun-only TypeScript project. Contributions should preserve the
public MCP and REST v1 contracts and keep every returned fact traceable to an
official source.

## Development

```bash
bun install
bun run check
bun src/index.ts http
```

## Adding a connector

1. Add the connector strategy in `src/connectors.ts`.
2. Route it through the connector dispatch functions.
3. Validate and bound every upstream response.
4. Preserve provenance and pass records through PII redaction.
5. Add offline tests with mocked upstream responses.
6. Document the connector capability and required configuration.

Connectors must never fabricate records or silently convert an upstream error
into an empty successful result.

## Pull requests

- Use conventional commits.
- Keep changes focused and immutable where practical.
- Include tests before implementation changes.
- Run `bun run check` and build the Docker image.
- Do not commit secrets, production logs, or generated source data.
