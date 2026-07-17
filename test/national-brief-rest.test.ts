import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";
const fixtureResult = (sourceId: string, records: Record<string, unknown>[]) => ({
  records, source_id: sourceId, dataset: null, total: records.length,
  fetched_at: "2026-07-17T00:00:00Z", citation: `https://example.test/${sourceId}`,
  license: "official", fields: [], data_quality: { quality_score: 0.9 },
}) as any;

describe("National Evidence Brief REST contract", () => {
  it("publishes four separate evidence pillars", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/national-brief?industry_limit=10"), {
      fetchHealthRecords: async () => fixtureResult("mohap_health_core_indicators_2024", [{ "Indicator Name": "Doctors", "2023": 10 }]),
      fetchIndustryRecords: async () => fixtureResult("moiat_industrial_licenses", [{ CompanyName: "A", EmirateNameEN: "Dubai", AreaNameEN: "Jebel Ali", Products: [] }]),
      fetchTaxRecords: async () => fixtureResult("fta_service_activity_2025", [{ Service_Name_EN: "Grand Total", Q1: 5, Q2: 5, Q3: 5, Q4: 5, "Grand Total": 20 }]),
    });
    const body = await response?.json();
    expect(response?.status).toBe(200);
    expect(body.data.kind).toBe("uae_national_evidence_brief");
    expect(body.data.pillars).toHaveLength(4);
    expect(body.data.methodology.compositeScore).toBe(false);
  });

  it("rejects invalid public bounds", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/national-brief?industry_limit=0"));
    expect(response?.status).toBe(422);
  });
});
