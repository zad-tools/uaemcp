import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";
import { SETTINGS } from "../src/config.js";

let server: Bun.Server<unknown>;
let baseUrl: string;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0);
  baseUrl = server.url.toString().replace(/\/$/, "");
});

afterAll(() => server.stop(true));

async function rpc(method: string, params: Record<string, unknown> = {}) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  return response.json() as Promise<any>;
}

async function call(name: string, args: Record<string, unknown>) {
  const payload = await rpc("tools/call", { name, arguments: args });
  return JSON.parse(payload.result.content[0].text);
}

describe("agent-first facade tools", () => {
  it("publishes three focused entry points without removing legacy tools", async () => {
    const payload = await rpc("tools/list");
    const names = payload.result.tools.map((tool: { name: string }) => tool.name);

    expect(names).toContain("uae_discover");
    expect(names).toContain("uae_query");
    expect(names).toContain("uae_analyze");
    expect(names).toContain("uae_search");
    expect(names).toContain("uae_source_records");
    expect(names).toContain("uae_evidence_dossier");
  });

  it("discovers local products without waiting for live portals", async () => {
    const result = await call("uae_discover", { action: "search", query: "golden visa", limit: 5 });

    expect(result.ok).toBe(true);
    expect(result.data.products.map((product: { id: string }) => product.id)).toContain("golden_residency_navigator");
    expect(result.data.searchMode).toBe("local_index");
    expect(result.meta).toMatchObject({ facade: true, delegatesTo: "uae_search" });
  });

  it("exposes source capabilities through one query entry point", async () => {
    const result = await call("uae_query", { action: "capabilities", source_id: "moiat_industrial_licenses" });

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ sourceId: "moiat_industrial_licenses" });
    expect(result.data.capabilities.records).toBe(true);
    expect(result.meta).toMatchObject({ facade: true, delegatesTo: "uae_source_get" });
  });

  it("lists methodology-backed indicators through one analysis entry point", async () => {
    const result = await call("uae_analyze", { action: "indicators" });

    expect(result.ok).toBe(true);
    expect(result.data.map((indicator: { id: string }) => indicator.id)).toContain("api_health_score");
    expect(result.meta).toMatchObject({ facade: true, delegatesTo: "uae_indicator" });
  });

  it("offers a core profile that hides specialist tools without deleting them", async () => {
    const previous = SETTINGS.toolProfile;
    SETTINGS.toolProfile = "core";
    try {
      const payload = await rpc("tools/list");
      const names = payload.result.tools.map((tool: { name: string }) => tool.name).sort();
      expect(names).toEqual([
        "uae_analyze",
        "uae_dashboard_summary",
        "uae_discover",
        "uae_observatory",
        "uae_products_list",
        "uae_query",
      ]);
    } finally {
      SETTINGS.toolProfile = previous;
    }
  });
});
