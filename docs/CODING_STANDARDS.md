# Coding standards

- Bun-only strict TypeScript; no second server implementation.
- Preserve existing MCP tool names and REST v1 behavior.
- Validate inputs and upstream payloads at their boundaries.
- Keep network reads bounded by timeout, size, redirects and pagination.
- Return explicit errors; never disguise an unavailable source as an empty result.
- Preserve citations, license state, quality metadata and lineage.
- Redact public contact data before it crosses the server boundary.
- Add offline tests before implementation and run `bun run check`.
- Use conventional commits and never include credentials or captured source data.
- Prefer focused modules and immutable returned values.
