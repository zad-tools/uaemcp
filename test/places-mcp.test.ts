import { describe, expect, it } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { FetchResult } from "../src/connectors.js";
import { buildServer } from "../src/server.js";

describe("place names MCP product", () => {
  it("exposes normalized FGIC place evidence as a focused tool", async () => {
    const result: FetchResult = {
      records: [{ objectid: 2, gazetteername: "دبي", englishname: "Dubai", _geometry: { type: "Point", coordinates: [55.27, 25.2] } }], total: 1,
      citation: "https://atlas.fgic.gov.ae/", license: "informational use", source_id: "fgic_national_gazetteer", fetched_at: "2026-07-17T00:00:00.000Z", dataset: "0", fields: [],
      data_quality: { confidence: 1, warnings: [], validation: {}, completeness: 1, freshness: { status: "unknown", observed_at: null }, source_trust: "official_registry", coverage: { returned: 1, upstream_total: 1, ratio: 1 }, schema_stability: { status: "unknown", compared_to: null }, last_successful_sync: null, record_count_trend: { status: "unknown", change: null }, quality_score: 1 },
    };
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = buildServer({ fetchPlaceRecords: async () => result });
    const client = new Client({ name: "test", version: "1" });
    await server.connect(serverTransport); await client.connect(clientTransport);
    const tools = await client.listTools();
    expect(tools.tools.some((tool) => tool.name === "uae_place_names")).toBe(true);
    const response = await client.callTool({ name: "uae_place_names", arguments: { query: "دبي", limit: 10 } });
    const payload = JSON.parse((response.content as Array<{ text: string }>)[0].text);
    expect(payload.ok).toBe(true);
    expect(payload.data.places[0].name).toEqual({ ar: "دبي", en: "Dubai" });
    await client.close(); await server.close();
  });
});
