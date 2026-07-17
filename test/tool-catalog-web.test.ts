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
    expect(payload.data.summary).toEqual({ total: 38, read: 35, write: 2, mixed: 1 });
    expect(payload.data.generatedFrom).toBe("runtime_registered_tools");
    expect(payload.data.tools).toHaveLength(38);
    expect(payload.data.tools.some((tool: { name: string }) => tool.name === "uae_dataset_snapshot")).toBe(true);
    expect(openApiDocument().paths).toHaveProperty("/api/v1/tools");
  });

  it("ships a bilingual Dubai Font explorer driven by the REST contract", () => {
    const html = toolExplorerPage();
    expect(html).toContain("MCP Tools Explorer");
    expect(html).toContain("مستكشف أدوات MCP");
    expect(html).toContain("/api/v1/tools");
    expect(html).toContain('font-family:"Dubai"');
    expect(html).toContain('html body *{font-family:"Dubai",Arial,sans-serif!important}');
    expect(html).toContain("document.documentElement.dir=state.lang==='ar'?'rtl':'ltr'");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
