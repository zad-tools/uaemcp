# Open Emirates packages

| Package | Interface | Depends on MCP |
|---|---|---|
| `@open-emirates/contracts` | Stable response contracts and validation | No |
| `@open-emirates/sdk` | Typed TypeScript data client | No |
| `@open-emirates/mcp` | MCP stdio and HTTP entry point | Yes |

The packages share one repository but have independent package names and release lines. The `uaemcp` package remains the compatibility engine until the migration is complete.
