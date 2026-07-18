import { describe, expect, it } from "bun:test";
import { buildServer } from "../src/server.js";
import { trustSummary } from "../src/manifest.js";
import { createToolCatalog } from "../src/tool-catalog.js";
import { VERSION } from "../src/version.js";

describe("generated MCP tool catalog", () => {
  it("derives every entry from the registered runtime instead of a manual list", () => {
    const server = buildServer() as unknown as { _registeredTools: Record<string, { description?: string }> };
    const catalog = createToolCatalog(server._registeredTools, VERSION);
    expect(catalog.summary.total).toBe(46);
    expect(catalog.summary.total).toBe(trustSummary().totalTools);
    expect(catalog.tools.map((tool) => tool.name)).toEqual(Object.keys(server._registeredTools).sort());
    expect(catalog.tools.find((tool) => tool.name === "uae_source_add")?.kind).toBe("write");
    expect(catalog.tools.find((tool) => tool.name === "uae_dataset_snapshot")?.kind).toBe("mixed");
    expect(catalog.tools.every((tool) => tool.description.length > 10)).toBe(true);
    expect(catalog.schemaVersion).toBe("2.1");
    expect(catalog.tools.every((tool) => tool.outputSchema.type === "object")).toBe(true);
    expect(catalog.tools.every((tool) => tool.outputSchema.required)).toBe(true);
    expect(catalog.tools.every((tool) => tool.stability === "stable" && tool.deprecated === false)).toBe(true);
    expect(catalog.tools.find((tool) => tool.name === "uae_search")).toMatchObject({
      idempotent: true,
      sideEffects: false,
      authScopes: [],
    });
    expect(catalog.tools.find((tool) => tool.name === "uae_source_add_metadata")).toMatchObject({
      idempotent: false,
      sideEffects: true,
      authScopes: ["tools:write"],
    });
  });
});
