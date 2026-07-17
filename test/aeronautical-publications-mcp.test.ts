import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;
const page = `<html><body><table><tr><td>16 JUL 2026</td><td>23 JUL 2026</td><td>03 SEP 2026</td><td>SUP 26/2026</td></tr></table></body></html>`;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0, { fetchAeronauticalPublicationsPage: async () => page });
  baseUrl = server.url.toString().replace(/\/$/, "");
});
afterAll(() => server.stop(true));

const rpc = async (method: string, params: Record<string, unknown>) => fetch(`${baseUrl}/mcp`, {
  method: "POST", headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
}).then((response) => response.json());

describe("GCAA Aeronautical Publications MCP contract", () => {
  it("matches REST and publishes a non-operational methodology resource", async () => {
    const toolPayload = await rpc("tools/call", { name: "uae_aeronautical_publications", arguments: { kind: "supplement", limit: 1 } });
    const mcp = JSON.parse(toolPayload.result.content[0].text);
    const rest = await fetch(`${baseUrl}/api/v1/aeronautical-publications?kind=supplement&limit=1`).then((response) => response.json());
    expect({ ...mcp.data, generatedAt: null }).toEqual({ ...rest.data, generatedAt: null });
    expect(mcp.meta.filters).toEqual(rest.meta.filters);
    expect(mcp.meta).toMatchObject({ decision: "discovery_only", operational_use: false });

    const resourcePayload = await rpc("resources/read", { uri: "uae://aeronautical-publications/methodology" });
    const methodology = JSON.parse(resourcePayload.result.contents[0].text);
    expect(methodology).toMatchObject({ datesInterpreted: false, operationalUse: false, notamFeed: false, flightPlanningSource: false });
  });
});
