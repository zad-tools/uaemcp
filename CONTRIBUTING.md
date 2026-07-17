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

1. Copy `templates/connector-plugin.ts` or implement the public `Connector` contract.
2. Register it with `registerConnector`; MCP and REST routing require no edits.
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
- Complete the pull-request evidence, verification and limitations checklist.

Use the structured GitHub forms for bugs, official UAE source proposals and
connector proposals. Security vulnerabilities and exposed personal data belong
in a private advisory, never a public issue.

The complete project conventions are in `docs/CODING_STANDARDS.md`; architecture
and trust-boundary decisions are in `docs/ARCHITECTURE.md` and
`docs/THREAT_MODEL.md`.
