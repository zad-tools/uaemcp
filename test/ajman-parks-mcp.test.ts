import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";
let server: Bun.Server<unknown>, baseUrl: string;
beforeAll(() => { server = runHttp("127.0.0.1", 0, { fetchAjmanParksRecords: (async () => ({ records: [{ year: 2023, park_name_en: "A", park_name_ar: "أ", numne_of_parks_visitors: "12" }], total: 1, fetched_at: "2026-05-13T10:47:26.040Z", citation: "https://data.ajman.ae/explore/dataset/parks-visitors-in-ajman/", license: "CC BY 4.0", data_quality: {} })) as never }); baseUrl = server.url.toString().replace(/\/$/, ""); });
afterAll(() => server.stop(true));
describe("Ajman Parks Footfall MCP product", () => {
  it("matches the bounded evidence contract", async () => {
    const response = await fetch(`${baseUrl}/mcp`, { method: "POST", headers: { accept: "application/json, text/event-stream", "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "uae_ajman_parks_footfall", arguments: {} } }) });
    const payload = await response.json(), body = JSON.parse(payload.result.content[0].text);
    expect(body.ok).toBe(true);
    expect(body.data).toMatchObject({ kind: "ajman_parks_footfall", summary: { publishedVisitObservations: 12 } });
  });
});
