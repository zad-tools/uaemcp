import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;
const fetcher = async (source: { id: string }) => ({
  records: [{ "No.": 1, "Facility Name English": "Clinic", "Facility Name Arabic": "عيادة", Coordinator: "25.2,55.2" }],
  source_id: source.id, fetched_at: "2026-07-18T00:00:00Z", citation: "https://mohap.gov.ae/open-data", license: "open",
  dataset: null, total: 1, fields: [], data_quality: { quality_score: 1 },
}) as any;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0, { fetchHealthFacilitiesMapRecords: fetcher });
  baseUrl = server.url.toString().replace(/\/$/, "");
});
afterAll(() => server.stop(true));

describe("MOHAP Health Facilities Map MCP contract", () => {
  it("matches REST and publishes a privacy-bounded methodology resource", async () => {
    const response = await fetch(`${baseUrl}/mcp`, { method: "POST", headers: { accept: "application/json, text/event-stream", "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "uae_health_facilities_map", arguments: { near: "25.2,55.2,25", limit: 10 } } }) });
    const payload = await response.json();
    const mcp = JSON.parse(payload.result.content[0].text);
    const rest = await fetch(`${baseUrl}/api/v1/health-facilities-map?near=25.2,55.2,25&limit=10`).then((item) => item.json());
    expect(mcp.data).toEqual(rest.data);
    expect(mcp.meta.filters).toEqual(rest.meta.filters);

    const resourceResponse = await fetch(`${baseUrl}/mcp`, { method: "POST", headers: { accept: "application/json, text/event-stream", "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "resources/read", params: { uri: "uae://health-facilities-map/methodology" } }) });
    const resourcePayload = await resourceResponse.json();
    const methodology = JSON.parse(resourcePayload.result.contents[0].text);
    expect(methodology).toMatchObject({ grain: "published facility location", directContactFieldsReturned: false, individualHealthDataReturned: false });
  });
});
