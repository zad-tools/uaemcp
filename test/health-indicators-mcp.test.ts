import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0, {
    fetchHealthRecords: async () => ({
      records: [{ "Indicator Name": "Life expectancy at birth", "2022": 83.1, "2023": 83.4 }],
      source_id: "mohap_health_core_indicators_2024", dataset: null, total: 111,
      fetched_at: "2026-07-17T00:00:00Z", citation: "https://mohap.gov.ae/en/open-data/mohap-open-data",
      license: "MOHAP open data", fields: [], data_quality: { quality_score: 0.9 },
    } as any),
  });
  baseUrl = server.url.toString().replace(/\/$/, "");
});

afterAll(() => server.stop(true));

describe("MOHAP Health Indicators MCP product", () => {
  it("matches the REST evidence contract", async () => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "uae_health_indicators", arguments: { query: "life", limit: 10 } } }),
    });
    const payload = await response.json();
    const mcp = JSON.parse(payload.result.content[0].text);
    const rest = await fetch(`${baseUrl}/api/v1/health-indicators?q=life&limit=10`).then((result) => result.json());
    expect(response.status).toBe(200);
    expect(mcp.data).toEqual(rest.data);
    expect(mcp.meta).toMatchObject({ source_id: "mohap_health_core_indicators_2024", returned_records: 1 });
  });
});
