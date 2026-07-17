# MCP client setup

UAEMCP exposes the same read-oriented tools through two transports:

- **Hosted Streamable HTTP:** `https://uaemcp.zad.tools/mcp`
- **Local stdio with Bun:** `bunx --bun uaemcp@latest`

Use hosted HTTP for the shortest setup. Use stdio when the client launches local
servers and Bun 1.3 or newer is installed. The hosted endpoint is public and
does not require an API key; tool calls are still subject to the gateway's rate
limit.

> **npm status:** npm `latest` is the signed Bun release published from GitHub
> Actions through Trusted Publishing with provenance. Use `uaemcp@1.75.1` instead
> of `@latest` when reproducibility matters.

## Quick matrix

| Client | Hosted HTTP | Bun GitHub stdio | Where to add it |
| --- | --- | --- | --- |
| Claude Desktop / Claude.ai | Add a custom remote connector with the hosted URL | Add the JSON below as a local developer MCP server | Settings → Connectors for remote; Developer settings for local |
| Claude Code | `claude mcp add --transport http uae-intelligence https://uaemcp.zad.tools/mcp` | `claude mcp add uae-intelligence -- bunx --bun uaemcp@latest` | CLI; verify with `/mcp` |
| Cursor | Remote entry below | stdio entry below | `.cursor/mcp.json` or the user MCP settings |
| VS Code | HTTP entry below | stdio entry below | `.vscode/mcp.json` or **MCP: Open User Configuration** |
| Cline | Use its MCP Servers UI if the installed version offers Streamable HTTP | Add the stdio command in its MCP Servers UI | Cline → MCP Servers; field names vary by Cline version |
| Codex | TOML remote entry below | TOML stdio entry below | `~/.codex/config.toml` |
| n8n | Use an **MCP Client Tool** with the hosted URL and Streamable HTTP | No direct stdio recipe is documented here | AI Agent workflow → MCP Client Tool |

The matrix only claims transports documented by each client. In particular,
UAEMCP does not ship a Claude Desktop extension, Cursor one-click installer,
VS Code gallery package, Cline package, Codex plugin, or n8n node.

## JSON clients

### Claude Desktop local stdio

Add this server to the local MCP developer configuration, then fully restart
Claude Desktop:

```json
{
  "mcpServers": {
    "uae-intelligence": {
      "command": "bunx",
      "args": ["--bun", "uaemcp@latest"]
    }
  }
}
```

For hosted HTTP in Claude Desktop or Claude.ai, add a custom connector with:

```text
https://uaemcp.zad.tools/mcp
```

Remote connectors and local developer servers are separate Claude mechanisms;
do not paste the hosted URL into the stdio JSON.

### Cursor

Hosted HTTP (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "uae-intelligence": {
      "url": "https://uaemcp.zad.tools/mcp"
    }
  }
}
```

Local stdio:

```json
{
  "mcpServers": {
    "uae-intelligence": {
      "command": "bunx",
      "args": ["--bun", "uaemcp@latest"]
    }
  }
}
```

After saving, open Cursor's MCP settings and confirm that the server is enabled
and its tools were discovered.

### VS Code

VS Code uses a top-level `servers` object rather than `mcpServers`.

Hosted HTTP (`.vscode/mcp.json`):

```json
{
  "servers": {
    "uaeIntelligence": {
      "type": "http",
      "url": "https://uaemcp.zad.tools/mcp"
    }
  }
}
```

Local stdio:

```json
{
  "servers": {
    "uaeIntelligence": {
      "type": "stdio",
      "command": "bunx",
      "args": ["--bun", "uaemcp@latest"]
    }
  }
}
```

Run **MCP: List Servers** to start, restart, inspect output, or reset cached
tools. Cline has its own MCP configuration UI; use the same executable and
arguments for stdio, but follow the field names shown by the installed Cline
version.

## Codex

Add one of these entries to `~/.codex/config.toml`.

Hosted HTTP:

```toml
[mcp_servers.uae-intelligence]
url = "https://uaemcp.zad.tools/mcp"
```

Local stdio:

```toml
[mcp_servers.uae-intelligence]
command = "bunx"
args = ["--bun", "uaemcp@latest"]
```

Restart Codex after editing the configuration and check that the server's tools
appear before running the test prompt.

## n8n

In an AI Agent workflow, add an **MCP Client Tool**, select its Streamable HTTP
transport, and set the MCP endpoint to:

```text
https://uaemcp.zad.tools/mcp
```

No credentials are required for the public gateway. Attach the tool to the AI
Agent and test the workflow manually before activating it. This repository does
not document a direct Bun stdio child-process integration for n8n; self-hosters
who do not want the public gateway should run UAEMCP in HTTP mode and give n8n a
network-reachable `/mcp` URL.

## Acceptance prompt

Run this without pasting any UAE facts into the conversation:

```text
Use the UAE intelligence MCP tools to list the available public evidence
products. Return three products with their web route, evidence scope and one
limitation each. Cite only metadata returned by the tool and say when a field is
missing.
```

A successful connection should call `uae_products_list` and return structured,
source-bounded product metadata. It should not answer only from model memory,
invent eligibility decisions, or turn sampled records into national totals.
Product counts can change, so the test does not require a fixed count.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No tools appear | Restart the client, confirm the server is enabled, and refresh/reset its MCP tool cache. |
| `bunx` is not found | Install Bun 1.3+, then run `bun --version` and `bunx --bun uaemcp@latest doctor` in a terminal. GUI apps may need an absolute path to `bunx` when their `PATH` differs from the shell. |
| Local server exits immediately | Run the exact `bunx` command in a terminal. MCP stdio reserves stdout for protocol messages; inspect client logs or stderr for diagnostics. |
| Hosted connection fails | Check `https://uaemcp.zad.tools/ready`. A healthy process does not guarantee that every upstream UAE portal is available. |
| Client reports an HTTP or SSE mismatch | Select **Streamable HTTP**, not a legacy SSE-only mode. The UAEMCP endpoint is `/mcp`; a REST route such as `/api/v1` is not an MCP endpoint. |
| Configuration parses but never starts | Check whether the client expects `mcpServers` (Claude/Cursor), `servers` (VS Code), or TOML tables (Codex). Do not mix the formats. |
| Tool call is rate-limited | Wait for the reported retry interval. Do not add credentials: the hosted read gateway currently documents no client API key. |
| A source returns unavailable or partial data | Preserve the returned limitation and citation. Source health and coverage are intentionally distinct from MCP connection health. |

For server-side diagnostics, run `doctor`; for the hosted process use `/ready`,
and for source availability use the Observatory or source-health tools.
