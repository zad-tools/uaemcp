import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0, {
    fetchTradeRecords: async (_source, options = {}) => ({
      records: [{ destinationen: options.dataset?.includes("re-export") ? "QATAR" : "KUWAIT", destinationar: "وجهة", moten: "By Road", motar: "البر", productcode: 61130000 }],
      source_id: "ajman_data_portal", dataset: options.dataset ?? null, total: 10,
      fetched_at: "2026-07-17T00:00:00Z", citation: "https://data.ajman.ae", license: "open", fields: [],
      data_quality: { quality_score: 0.8 },
    } as any),
  });
  baseUrl = server.url.toString().replace(/\/$/, "");
});

afterAll(() => server.stop(true));

describe("Trade Flow Radar MCP product", () => {
  it("matches the REST evidence product", async () => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "uae_trade_flow_radar", arguments: { limit: 20 } } }),
    });
    const payload = await response.json();
    const mcp = JSON.parse(payload.result.content[0].text);
    const rest = await fetch(`${baseUrl}/api/v1/trade-flow?limit=20`).then((result) => result.json());
    expect(response.status).toBe(200);
    const { generatedAt: mcpGeneratedAt, ...mcpStable } = mcp.data;
    const { generatedAt: restGeneratedAt, ...restStable } = rest.data;
    expect(typeof mcpGeneratedAt).toBe("string");
    expect(typeof restGeneratedAt).toBe("string");
    expect(mcpStable).toEqual(restStable);
    expect(mcp.data.scope).toMatchObject({ sampledRecords: 4, upstreamRecords: 40 });
    expect(mcp.data.limitations.join(" ")).toContain("not trade value");
  });
});
