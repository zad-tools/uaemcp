import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { runHttp } from "../src/index.js";

let server: Bun.Server<unknown>;
let baseUrl: string;
const facilities = [{ Year: 2024, "Emirate En": "Dubai", "Emirate Ar": "دبي", "Sector En": "Private", "Sector Ar": "خاص", "Main Category_En": "Medical Facilities", "Main Category_Ar": "المنشآت الصحية", "Facility Type En": "Clinic", "Facility Type Ar": "عيادة", Total: 30 }];
const result = { records: facilities, source_id: "mohap_health_facilities_2024", dataset: null, total: 1, fetched_at: "2026-07-17T00:00:00Z", citation: "https://mohap.gov.ae/open-data", license: "unknown", fields: [], data_quality: { quality_score: 0.9 } } as any;

beforeAll(() => {
  server = runHttp("127.0.0.1", 0, { fetchHealthFacilitiesRecords: async () => result });
  baseUrl = server.url.toString().replace(/\/$/, "");
});
afterAll(() => server.stop(true));

describe("UAE Evidence Studio MCP contract", () => {
  it("matches the REST dossier for the same bounded selection", async () => {
    const input = { template: "evidence_brief", question: "What does official health and education evidence show?", language: "en", pillars: ["education", "health_facilities"] };
    const response = await fetch(`${baseUrl}/mcp`, { method: "POST", headers: { accept: "application/json, text/event-stream", "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "uae_evidence_dossier", arguments: input } }) });
    const payload = await response.json();
    const mcp = JSON.parse(payload.result.content[0].text);
    const rest = await fetch(`${baseUrl}/api/v1/evidence-dossier`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }).then((item) => item.json());

    expect(response.status).toBe(200);
    expect(mcp.data).toEqual(rest.data);
    expect(mcp.meta).toMatchObject({
      stored: false,
      available_pillars: 2,
      question_privacy: { handling: "transient", persisted: false },
    });
  });
});
