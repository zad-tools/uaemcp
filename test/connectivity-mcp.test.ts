import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;
const fields: Record<string, string> = {
  tdra_active_mobile_subscriptions_2025: "Active Mobile Subscriptions[ii]",
  tdra_broadband_per_100_2025: "Broadband Internet Subscriptions per 100 inhabitants",
  tdra_fixed_lines_per_100_2025: "Fixed lines per 100 inhabitants",
};
const fetcher = async (source: { id: string }) => ({
  records: [{ Statistics: 45992, [fields[source.id] ?? "unknown"]: 20.4 }], source_id: source.id,
  dataset: null, total: 1, fetched_at: "2026-07-18T00:00:00Z", citation: `https://tdra.gov.ae/${source.id}`,
  license: "TDRA Open Data Policy", fields: [], data_quality: { quality_score: 0.95 },
}) as any;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0, { fetchConnectivityRecords: fetcher as any });
  baseUrl = server.url.toString().replace(/\/$/, "");
});
afterAll(() => server.stop(true));

describe("TDRA Connectivity Pulse MCP contract", () => {
  it("matches the REST contract and publishes its methodology resource", async () => {
    const toolResponse = await fetch(`${baseUrl}/mcp`, { method: "POST", headers: { accept: "application/json, text/event-stream", "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "uae_connectivity_pulse", arguments: { series: "fixed_lines_per_100_inhabitants", from: "2025-12-01" } } }) });
    const toolPayload = await toolResponse.json();
    const mcp = JSON.parse(toolPayload.result.content[0].text);
    const rest = await fetch(`${baseUrl}/api/v1/connectivity?series=fixed_lines_per_100_inhabitants&from=2025-12-01`).then((result) => result.json());
    expect(mcp.data).toEqual(rest.data);
    expect(mcp.meta.filters).toEqual(rest.meta.filters);

    const resourceResponse = await fetch(`${baseUrl}/mcp`, { method: "POST", headers: { accept: "application/json, text/event-stream", "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "resources/read", params: { uri: "uae://connectivity/methodology" } }) });
    const resourcePayload = await resourceResponse.json();
    const methodology = JSON.parse(resourcePayload.result.contents[0].text);
    expect(methodology).toMatchObject({ compositeScore: false, subscriptionsArePeople: false });
  });
});
