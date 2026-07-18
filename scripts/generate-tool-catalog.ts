import { buildServer } from "../src/server.js";
import { createToolCatalog, toolCatalogMarkdown, toolCatalogTypescript } from "../src/tool-catalog.js";
import { VERSION } from "../src/version.js";

const check = process.argv.includes("--check");
const server = buildServer() as unknown as { _registeredTools: Record<string, { description?: string }> };
const catalog = createToolCatalog(server._registeredTools, VERSION);
const outputs = new Map([
  ["docs/mcp-tools.json", `${JSON.stringify(catalog, null, 2)}\n`],
  ["docs/MCP_TOOLS.md", toolCatalogMarkdown(catalog)],
  ["packages/sdk/src/tool-types.generated.ts", toolCatalogTypescript(catalog)],
]);
let stale = false;
for (const [path, content] of outputs) {
  if (check) {
    const current = await Bun.file(path).text().catch(() => "");
    if (current !== content) { console.error(`${path} is stale`); stale = true; }
  } else await Bun.write(path, content);
}
if (stale) { console.error("Generated MCP tool catalog is stale. Run: bun run generate:tools"); process.exit(1); }
if (!check) console.log(`Generated ${catalog.summary.total} runtime MCP tool definitions`);
