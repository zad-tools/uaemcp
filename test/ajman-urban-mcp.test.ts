import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;
const fixture = async (_source: unknown, options: { dataset?: string | null } = {}) => ({
  records: [{ year: 2024, value: 1, building_licenses_issued_classified_by_license_type_in_the_emirate_of_ajman: 1, total_of_certified_rent_contracts_in_ajman_city: 1, total_of_certified_rent_contracts_in_masfout_city: 1, the_length_of_the_new_road_added_in_the_emirate_km: 1, total_number_of_developed_crossroads: 1 }],
  source_id: "ajman_data_portal", dataset: options.dataset ?? null, total: 1, fetched_at: "2026-07-17T00:00:00Z", citation: "https://data.ajman.ae", license: "open", fields: [], data_quality: { quality_score: 0.9 },
} as any);
beforeAll(() => { server = runHttp("127.0.0.1", 0, { fetchAjmanUrbanRecords: fixture }); baseUrl = server.url.toString().replace(/\/$/, ""); });
afterAll(() => server.stop(true));

describe("Ajman Urban Evidence MCP product", () => {
  it("matches the REST evidence contract", async () => {
    const response = await fetch(`${baseUrl}/mcp`, { method: "POST", headers: { accept: "application/json, text/event-stream", "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "uae_ajman_urban_evidence", arguments: { limit: 100 } } }) });
    const payload = await response.json(), mcp = JSON.parse(payload.result.content[0].text);
    const rest = await fetch(`${baseUrl}/api/v1/ajman-urban?limit=100`).then((result) => result.json());
    const { generatedAt: _mcpTime, ...mcpStable } = mcp.data;
    const { generatedAt: _restTime, ...restStable } = rest.data;
    expect(response.status).toBe(200);
    expect(mcpStable).toEqual(restStable);
    expect(mcp.data.scope.datasets).toHaveLength(6);
  });
});
