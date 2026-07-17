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

  it("accepts the emirate ids emitted by the web form and filters the industry pillar", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/national-brief?emirate=abu_dhabi"), {
      fetchHealthRecords: async () => fixtureResult("mohap_health_core_indicators_2024", [{ "Indicator Name": "Doctors", "2023": 10 }]),
      fetchIndustryRecords: async () => fixtureResult("moiat_industrial_licenses", [
        { CompanyName: "A", EmirateNameEN: "Abu Dhabi", Products: [] },
        { CompanyName: "B", EmirateNameEN: "Dubai", Products: [] },
      ]),
      fetchTaxRecords: async () => fixtureResult("fta_service_activity_2025", [{ Service_Name_EN: "Grand Total", Q1: 5, Q2: 5, Q3: 5, Q4: 5, "Grand Total": 20 }]),
    });
    const body = await response?.json();
    const industry = body.data.pillars.find((pillar: { id: string }) => pillar.id === "industry");

    expect(response?.status).toBe(200);
    expect(body.meta.filters.emirate).toBe("abu_dhabi");
    expect(industry.data.scope.sampleSize).toBe(1);
    expect(industry.data.emirates).toEqual([expect.objectContaining({ id: "abu_dhabi", establishments: 1 })]);
  });
});
