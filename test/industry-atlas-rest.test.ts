import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("Industry Atlas REST contract", () => {
  it("publishes a bounded, source-cited industrial evidence slice", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/industry-atlas?limit=20&emirate=Dubai"), {
      fetchIndustryRecords: async () => ({
        records: [{ ID: "1", CompanyName: "Dubai Factory", EmirateNameEN: "Dubai", AreaNameEN: "Al Quoz", Latitude: "25.12", Longitude: "55.21", Products: [] }],
        source_id: "moiat_industrial_licenses", fetched_at: "2026-07-17T00:00:00Z", citation: "https://moiat.gov.ae/en/open-data",
        license: "open", dataset: null, total: null, fields: [],
        data_quality: { quality_score: 0.79 },
      } as any),
    });
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.data).toMatchObject({ kind: "industry_atlas_evidence_slice", filters: { emirate: "Dubai" }, scope: { sampleSize: 1, completePopulation: false } });
    expect(payload.meta).toMatchObject({ source_id: "moiat_industrial_licenses", requested_limit: 20, citation: "https://moiat.gov.ae/en/open-data" });
  });
});
