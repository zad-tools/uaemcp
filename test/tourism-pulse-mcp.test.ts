import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0, { fetchTourismWorkbook: async () => { throw new Error("blocked"); } });
  baseUrl = server.url.toString().replace(/\/$/, "");
});
afterAll(() => server.stop(true));

const rpc = async (method: string, params: Record<string, unknown>) => fetch(`${baseUrl}/mcp`, {
  method: "POST", headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
}).then((response) => response.json());

describe("UAE Tourism Pulse MCP contract", () => {
  it("matches REST filters and exposes the evidence-boundary methodology", async () => {
    const toolPayload = await rpc("tools/call", { name: "uae_tourism_pulse", arguments: { metric: "hotel_rooms", from_year: 2025, to_year: 2025 } });
    const mcp = JSON.parse(toolPayload.result.content[0].text);
    const rest = await fetch(`${baseUrl}/api/v1/tourism-pulse?metric=hotel_rooms&from_year=2025&to_year=2025`).then((response) => response.json());
    expect(mcp.data).toEqual(rest.data);
    expect(mcp.meta.filters).toEqual(rest.meta.filters);
    expect(mcp.meta).toMatchObject({ units_kept_separate: true, causal_interpretation: false });

    const resourcePayload = await rpc("resources/read", { uri: "uae://tourism-pulse/methodology" });
    const methodology = JSON.parse(resourcePayload.result.contents[0].text);
    expect(methodology).toMatchObject({ frequency: "annual", geography: "UAE national aggregate", unitsKeptSeparate: true, guestArrivalsAreUniqueTourists: false, causalInterpretation: false });
  });
});
