import { describe, expect, it } from "bun:test";
import { handleRest } from "../src/rest.js";

describe("Health Indicators REST contract", () => {
  it("publishes a cited and bounded official MOHAP indicator report", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/health-indicators?q=life&limit=10"), {
      fetchHealthRecords: async () => ({
        records: [{ "Indicator Name": "Life expectancy at birth", "2022": 83.1, "2023": 83.4 }],
        source_id: "mohap_health_core_indicators_2024", dataset: null, total: 111,
        fetched_at: "2026-07-17T00:00:00Z", citation: "https://mohap.gov.ae/en/open-data/mohap-open-data",
        license: "MOHAP open data", fields: [], data_quality: { quality_score: 0.9 },
      } as any),
    });
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.data).toMatchObject({ kind: "mohap_health_core_indicators_2024", scope: { usableIndicators: 1 } });
    expect(payload.meta).toMatchObject({ source_id: "mohap_health_core_indicators_2024", returned_records: 1 });
  });

  it("serves a verified snapshot instead of failing when MOHAP blocks the runtime", async () => {
    const response = await handleRest(new Request("http://localhost/api/v1/health-indicators?limit=2"), {
      fetchHealthRecords: async () => { throw new Error("upstream unavailable"); },
    });
    const payload = await response?.json();
    expect(response?.status).toBe(200);
    expect(payload.meta).toMatchObject({ delivery: "verified_snapshot", returned_records: 111 });
    expect(payload.data.source).toMatchObject({ delivery: "verified_snapshot", sha256: "d44fc92682b2bc5b76a98fcf53578c9f4ebc4d39acb3c06aca12291673f7a3d0" });
    expect(payload.data.limitations.at(-1)).toContain("verified snapshot");
  });
});
