# Open Emirates package architecture

Open Emirates uses one repository and independent published packages.

## Dependency direction

```text
Official API and OpenAPI contract
              |
              v
@open-emirates/contracts
              |
              v
   @open-emirates/sdk

uaemcp engine
      |
      v
@open-emirates/mcp
```

The SDK never imports MCP. The MCP package is a runtime adapter. The existing `uaemcp` package remains compatible throughout the migration.

## Independent release tags

| Package | Tag format |
|---|---|
| `@open-emirates/contracts` | `contracts-v0.1.0` |
| `@open-emirates/sdk` | `sdk-v0.1.0` |
| `@open-emirates/mcp` | `mcp-v0.1.0` |

Before the first publish, create or claim the `open-emirates` npm scope and configure npm Trusted Publishing for `.github/workflows/publish-open-emirates.yml` once per package.

## Compatibility

`bunx uaemcp` remains supported. After `@open-emirates/mcp` is established, documentation can prefer `bunx @open-emirates/mcp` without breaking existing installs.
