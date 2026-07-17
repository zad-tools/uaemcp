import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";
import type { FetchResult } from "../src/connectors.js";

let server: Bun.Server<unknown>;
let baseUrl: string;

const fixture: FetchResult = {
  records: [
    { Service_Name_EN: "VAT Registration", Service_Name_AR: "التسجيل", Q1: 1, Q2: 2, Q3: 3, Q4: 4, "Grand Total": 10 },
    { Service_Name_EN: "Grand Total", Service_Name_AR: "الإجمالي", Q1: 1, Q2: 2, Q3: 3, Q4: 4, "Grand Total": 10 },
  ],
  source_id: "fta_service_activity_2025",
  total: 2,
  citation: "https://tax.gov.ae/en/open.data/open.data.aspx",
  fetched_at: "2026-07-17T00:00:00Z",
  license: "FTA open data",
  dataset: null,
  fields: [],
  data_quality: {
    confidence: 1, warnings: [], validation: {}, completeness: 1,
    freshness: { status: "current", observed_at: "2026-07-17T00:00:00Z" },
    source_trust: "official_registry", coverage: { returned: 2, upstream_total: 2, ratio: 1 },
    schema_stability: { status: "unknown", compared_to: null }, last_successful_sync: "2026-07-17T00:00:00Z",
    record_count_trend: { status: "unknown", change: null }, quality_score: 1,
  },
};

beforeAll(() => {
  server = runHttp("127.0.0.1", 0, {
    fetchTaxRecords: async () => fixture,
  });
  baseUrl = server.url.toString().replace(/\/$/, "");
});

afterAll(() => server.stop(true));

describe("FTA service activity MCP product", () => {
  it("returns the same methodology-backed report through tools/call", async () => {
    const response = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "uae_tax_service_activity", arguments: {} } }),
    });
    const payload = await response.json();
    const body = JSON.parse(payload.result.content[0].text);
    const restBody = await fetch(`${baseUrl}/api/v1/tax-services`).then((result) => result.json());

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ officialTotal: 10, peakQuarter: { quarter: "Q4", count: 4 } });
    expect(body.meta).toMatchObject({ source_id: "fta_service_activity_2025", returned_records: 2 });
    expect(body.data).toEqual(restBody.data);
    expect(body.data.methodology).toBeDefined();
    expect(body.data.limitations).toContain("These are FTA-published service activity counts, not tax revenue, taxpayer totals, company counts, or an economic-growth measure.");
    expect(body.data.source.citation).toBe("https://tax.gov.ae/en/open.data/open.data.aspx");
  });
});
