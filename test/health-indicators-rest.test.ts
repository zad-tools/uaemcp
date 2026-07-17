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
});
