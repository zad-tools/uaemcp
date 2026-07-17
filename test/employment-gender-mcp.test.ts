import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0, { fetchEmploymentGenderWorkbook: async () => { throw new Error("blocked"); } });
  baseUrl = server.url.toString().replace(/\/$/, "");
});
afterAll(() => server.stop(true));

const rpc = async (method: string, params: Record<string, unknown>) => fetch(`${baseUrl}/mcp`, {
  method: "POST",
  headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
}).then((response) => response.json());

describe("MOHRE Employment by Gender MCP contract", () => {
  it("matches REST filters and exposes the evidence-boundary methodology", async () => {
    const toolPayload = await rpc("tools/call", { name: "uae_employment_gender", arguments: { gender: "male", from_year: 2024, to_year: 2024 } });
    const mcp = JSON.parse(toolPayload.result.content[0].text);
    const rest = await fetch(`${baseUrl}/api/v1/employment-gender?gender=male&from_year=2024&to_year=2024`).then((response) => response.json());
    expect(mcp.data).toEqual(rest.data);
    expect(mcp.meta.filters).toEqual(rest.meta.filters);
    expect(mcp.meta).toMatchObject({ private_sector_only: true, population_total: false });

    const resourcePayload = await rpc("resources/read", { uri: "uae://methodology/employment-gender" });
    const methodology = JSON.parse(resourcePayload.result.contents[0].text);
    expect(methodology).toMatchObject({
      authority: "Ministry of Human Resources and Emiratisation",
      period: "2020–2024",
      geography: "UAE",
      population: "employees registered in MOHRE private-sector systems",
      unit: "ratio",
      populationTotal: false,
    });
  });
});
