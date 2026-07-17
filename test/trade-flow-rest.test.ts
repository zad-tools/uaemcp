import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("Trade Flow Radar REST contract", () => {
  it("publishes a cited multi-dataset evidence product", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/trade-flow?limit=20"), {
      fetchTradeRecords: async (_source, options = {}) => ({
        records: [{ destinationen: options.dataset?.includes("re-export") ? "QATAR" : "KUWAIT", moten: "By Road", productcode: 1 }],
        source_id: "ajman_data_portal", dataset: options.dataset ?? null, total: 100,
        fetched_at: "2026-07-17T00:00:00Z", citation: "https://data.ajman.ae", license: "open", fields: [],
        data_quality: { quality_score: 0.8 },
      } as any),
    });
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.data).toMatchObject({ kind: "ajman_2023_trade_flow_evidence", scope: { sampledRecords: 4, upstreamRecords: 400 } });
    expect(payload.meta).toMatchObject({ source_id: "ajman_data_portal", requested_limit_per_dataset: 20 });
  });

  it("rejects a zero record limit instead of silently coercing it", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/trade-flow?limit=0"));
    const payload = await response?.json();
    expect(response?.status).toBe(422);
    expect(payload.error).toMatchObject({ code: "VALIDATION_ERROR", message: "limit must be at least 1" });
  });
});
