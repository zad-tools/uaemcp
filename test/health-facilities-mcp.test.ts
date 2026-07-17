import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;
const records = [{ Year: 2024, "Emirate En": "Dubai", "Emirate Ar": "دبي", "Sector En": "Private", "Sector Ar": "خاص", "Main Category_En": "Medical Facilities", "Main Category_Ar": "المنشآت الصحية", "Facility Type En": "Clinic", "Facility Type Ar": "عيادة", Total: 30 }];

beforeAll(() => {
  server = runHttp("127.0.0.1", 0, { fetchHealthFacilitiesRecords: async () => ({ records, source_id: "mohap_health_facilities_2024", dataset: null, total: 1, fetched_at: "2026-07-17T00:00:00Z", citation: "https://mohap.gov.ae/open-data", license: "unknown", fields: [], data_quality: { quality_score: 0.9 } } as any) });
  baseUrl = server.url.toString().replace(/\/$/, "");
});
afterAll(() => server.stop(true));

describe("Health Facilities Atlas MCP product", () => {
  it("matches the REST aggregate evidence contract", async () => {
    const response = await fetch(`${baseUrl}/mcp`, { method: "POST", headers: { accept: "application/json, text/event-stream", "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "uae_health_facilities_atlas", arguments: { year: "2024", emirate: "Dubai", sector: "Private", limit: 100 } } }) });
    const payload = await response.json();
    const mcp = JSON.parse(payload.result.content[0].text);
    const rest = await fetch(`${baseUrl}/api/v1/health-facilities?year=2024&emirate=Dubai&sector=Private`).then((result) => result.json());
    expect(response.status).toBe(200);
    expect(mcp.data).toEqual(rest.data);
    expect(mcp.meta).toMatchObject({ source_id: "mohap_health_facilities_2024", delivery: "live" });
  });
});
