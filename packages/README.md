# Open Emirates packages

| Package | Interface | Depends on MCP |
|---|---|---|
| `@open-emirates/contracts` | Stable response and MCP catalogue contracts | No |
| `@open-emirates/sdk` | Static + dynamic TypeScript data and tool client | No |
| `@open-emirates/mcp` | MCP stdio and HTTP entry point | Yes |

The packages share one repository but have independent package names and release lines. The `uaemcp` package remains the compatibility engine until the migration is complete.
