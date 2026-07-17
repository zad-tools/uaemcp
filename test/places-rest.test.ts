import { describe, expect, it } from "bun:test";
import type { FetchResult } from "../src/connectors.js";
import { handleRest } from "../src/rest.js";

const fetched: FetchResult = {
  records: [{ objectid: 9, gazetteername: "دبي", englishname: "Dubai", category: "مدينة", categoryeng: "City", _geometry: { type: "Point", coordinates: [55.27, 25.2] } }],
  total: 1,
  citation: "https://atlas.fgic.gov.ae/",
  license: "informational use",
  source_id: "fgic_national_gazetteer",
  fetched_at: "2026-07-17T00:00:00.000Z",
  dataset: "0", fields: [],
  data_quality: { confidence: 1, warnings: [], validation: {}, completeness: 1, freshness: { status: "unknown", observed_at: null }, source_trust: "official_registry", coverage: { returned: 1, upstream_total: 1, ratio: 1 }, schema_stability: { status: "unknown", compared_to: null }, last_successful_sync: null, record_count_trend: { status: "unknown", change: null }, quality_score: 1 },
};

describe("place names REST product", () => {
  const request = (path: string) => handleRest(new Request(`http://localhost${path}`), { fetchPlaceRecords: async (_source, options) => {
      expect(options).toMatchObject({ query: "دبي", limit: 20 });
      return fetched;
    } });

  it("publishes a dedicated bounded and cited endpoint", async () => {
    const response = await request(`/api/v1/places?q=${encodeURIComponent("دبي")}&limit=20`);
    if (!response) throw new Error("route not handled");
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.places[0]).toMatchObject({ id: "fgic:9", name: { ar: "دبي", en: "Dubai" } });
    expect(body.meta).toMatchObject({ source_id: "fgic_national_gazetteer", returned_records: 1 });
  });

  it("requires a meaningful query and caps the public sample", async () => {
    expect((await handleRest(new Request("http://localhost/api/v1/places")))?.status).toBe(422);
    expect((await handleRest(new Request("http://localhost/api/v1/places?q=a")))?.status).toBe(422);
    expect((await handleRest(new Request("http://localhost/api/v1/places?q=Dubai&limit=101")))?.status).toBe(422);
  });
});
