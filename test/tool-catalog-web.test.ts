import { describe, expect, it } from "bun:test";
import { singleInlineScript } from "./support/html.js";
import { handleRest } from "../src/rest.js";
import { toolExplorerPage } from "../src/tool-explorer-web.js";
import { openApiDocument } from "../src/openapi.js";

describe("public MCP Tools Explorer", () => {
  it("publishes the runtime-derived catalogue over REST", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/tools"));
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.data.summary).toEqual({ total: 46, read: 43, write: 2, mixed: 1 });
    expect(payload.data.generatedFrom).toBe("runtime_registered_tools");
    expect(payload.data.tools).toHaveLength(46);
    expect(payload.data.tools.some((tool: { name: string }) => tool.name === "uae_dataset_snapshot")).toBe(true);
    const search = payload.data.tools.find((tool: { name: string }) => tool.name === "uae_search");
    expect(search.inputSchema).toMatchObject({ type: "object", required: ["query"] });
    expect(search.outputSchema).toMatchObject({
      type: "object",
      required: ["ok", "data", "error", "meta"],
    });
    expect(search.exampleArguments).toMatchObject({ query: expect.any(String) });
    expect(search.limitations).toBeArray();
    expect(search.requiresAuth).toBe(false);
    expect(openApiDocument().paths).toHaveProperty("/api/v1/tools");
    expect(openApiDocument().paths).toHaveProperty("/api/v1/tools/{toolName}");
    expect(openApiDocument().paths).toHaveProperty("/api/v1/tools/{toolName}/call");
    expect((openApiDocument() as any).components.schemas.ToolCatalogEntry.required).toContain("outputSchema");
  });

  it("publishes tool detail and safely executes read tools", async () => {
    const detail = await handleRest(new Request("http://localhost/api/v1/tools/uae_products_list"));
    expect(detail?.status).toBe(200);
    expect((await detail?.json()).data.name).toBe("uae_products_list");

    const run = await handleRest(new Request("http://localhost/api/v1/tools/uae_products_list/call", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    }));
    const result = await run?.json();
    expect(run?.status).toBe(200);
    expect(result.ok).toBe(true);
    expect(result.meta.tool).toBe("uae_products_list");

    const write = await handleRest(new Request("http://localhost/api/v1/tools/uae_source_add_metadata/call", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    }));
    expect(write?.status).toBe(403);

    const invalid = await handleRest(new Request("http://localhost/api/v1/tools/uae_search/call", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    }));
    expect(invalid?.status).toBe(422);

    const missing = await handleRest(new Request("http://localhost/api/v1/tools/uae_missing/call", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    }));
    expect(missing?.status).toBe(404);
  });

  it("documents a valid Evidence Dossier example and transient question handling", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/tools/uae_evidence_dossier"));
    const tool = (await response?.json()).data;

    expect(response?.status).toBe(200);
    expect(tool.description).toContain("question is transient and not persisted");
    expect(tool.exampleArguments).toMatchObject({
      template: "research_dossier",
      question: "example",
      language: "en",
      pillars: ["education", "health_facilities"],
    });
  });

  it("ships a bilingual Dubai Font explorer driven by the REST contract", () => {
    const html = toolExplorerPage();
    expect(html).toContain("MCP Tools Explorer");
    expect(html).toContain("وحدة مطور MCP كاملة");
    expect(html).toContain("/api/v1/tools");
    expect(html).toContain("inputSchema");
    expect(html).toContain("TRY TOOL");
    expect(html).toContain("Claude Code");
    expect(html).toContain("Cursor");
    expect(html).toContain("Windmill");
    expect(html).toContain("n8n");
    expect(html).toContain('data-console-layout="true"');
    expect(html).toContain('class="tool-rail"');
    expect(html).toContain('class="result-dock"');
    expect(html).toContain('id="config-drawer"');
    expect(html).toContain('id="mobile-tool-picker"');
    expect(html).toContain('font-family:"Dubai"');
    expect(html).toContain('html body *{font-family:"Dubai",Arial,sans-serif!important}');
    expect(html).toContain("document.documentElement.dir=state.lang==='ar'?'rtl':'ltr'");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });

  it("serves the interactive discovery alias without changing the MCP endpoint", async () => {
    const response = await handleRest(new Request("http://localhost/mcp/tools"));
    expect(response?.status).toBe(200);
    expect(await response?.text()).toContain("MCP Developer Console");
  });
});
