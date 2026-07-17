import { describe, expect, it } from "bun:test";
import { loadNationalEvidenceBrief } from "../src/national-brief-service.js";

const quality = { quality_score: 0.9 };
const result = (sourceId: string, records: Record<string, unknown>[]) => ({
  records, source_id: sourceId, dataset: null, total: records.length,
  fetched_at: "2026-07-17T00:00:00Z", citation: `https://example.test/${sourceId}`,
  license: "official", fields: [], data_quality: quality,
}) as any;

const health = async () => result("mohap_health_core_indicators_2024", [{ "Indicator Name": "Life expectancy", "2023": 83.4 }]);
const industry = async () => result("moiat_industrial_licenses", [{ ID: "1", CompanyName: "Factory", EmirateNameEN: "Dubai", Products: [] }]);
const tax = async () => result("fta_service_activity_2025", [
  { Service_Name_EN: "Registration", Service_Name_AR: "تسجيل", Q1: 1, Q2: 2, Q3: 3, Q4: 4, "Grand Total": 10 },
  { Service_Name_EN: "Grand Total", Q1: 1, Q2: 2, Q3: 3, Q4: 4, "Grand Total": 10 },
]);

describe("national brief service", () => {
  it("loads four federal pillars and preserves filter scope", async () => {
    const loaded = await loadNationalEvidenceBrief({ healthLimit: 10, industryLimit: 20, emirate: "Dubai", query: "life" }, {
      fetchHealthRecords: health as any, fetchIndustryRecords: industry as any, fetchTaxRecords: tax as any,
      now: () => "2026-07-17T01:00:00Z",
    });

    expect(loaded.data.pillars.map((pillar) => [pillar.id, pillar.status])).toEqual([
      ["education", "snapshot"], ["health", "available"], ["industry", "available"], ["tax_activity", "available"],
    ]);
    expect(loaded.data.scope).toMatchObject({ pillarsAvailable: 4, pillarsDegraded: 0 });
    expect(loaded.meta).toMatchObject({ partial: false, available_pillars: 4, filters: { emirate: "Dubai", query: "life" } });
    expect((loaded.data.pillars[0]?.data as any).snapshot.generalEducation.total).toBe(1_811_145);
    expect((loaded.data.pillars[3]?.data as any).officialTotal).toBe(10);
  });

  it("returns explicit partial evidence when independent live sources fail", async () => {
    const down = async () => { throw new Error("upstream down"); };
    const loaded = await loadNationalEvidenceBrief({}, {
      fetchHealthRecords: health as any, fetchIndustryRecords: down as any, fetchTaxRecords: down as any,
    });

    expect(loaded.meta).toMatchObject({ partial: true, available_pillars: 2, degraded_pillars: 2 });
    expect(loaded.data.pillars.map((pillar) => [pillar.id, pillar.status])).toEqual([
      ["education", "snapshot"], ["health", "available"], ["industry", "unavailable"], ["tax_activity", "unavailable"],
    ]);
    expect(loaded.data.pillars[2]?.data).toBeNull();
    expect(loaded.data.pillars[2]?.evidence.error).toBe("upstream down");
    expect(loaded.data.limitations.join(" ")).toContain("text query applies to health and industry only");
  });

  it("uses the verified health snapshot when the health fetcher fails", async () => {
    const down = async () => { throw new Error("health down"); };
    const loaded = await loadNationalEvidenceBrief({}, {
      fetchHealthRecords: down as any, fetchIndustryRecords: industry as any, fetchTaxRecords: tax as any,
    });
    const healthPillar = loaded.data.pillars.find((pillar) => pillar.id === "health");

    expect(healthPillar?.status).toBe("snapshot");
    expect(healthPillar?.evidence).toMatchObject({ delivery: "verified_snapshot", sha256: "d44fc92682b2bc5b76a98fcf53578c9f4ebc4d39acb3c06aca12291673f7a3d0" });
    expect(loaded.meta.partial).toBe(false);
  });

  it("caps bounded input limits", async () => {
    let healthLimit = 0;
    let industryLimit = 0;
    await loadNationalEvidenceBrief({ healthLimit: 500, industryLimit: 500 }, {
      fetchHealthRecords: (async (_source: unknown, options: any) => { healthLimit = options.limit; return health(); }) as any,
      fetchIndustryRecords: (async (_source: unknown, options: any) => { industryLimit = options.limit; return industry(); }) as any,
      fetchTaxRecords: tax as any,
    });
    expect(healthLimit).toBe(200);
    expect(industryLimit).toBe(100);
  });
});
