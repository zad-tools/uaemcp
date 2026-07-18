import { describe, expect, it } from "bun:test";
import { loadEvidenceDossier } from "../src/evidence-dossier-service.js";

const result = (sourceId: string, records: Record<string, unknown>[], total: number | null = records.length) => ({
  records, source_id: sourceId, dataset: null, total,
  fetched_at: "2026-07-17T12:00:00Z", citation: `https://example.test/${sourceId}`,
  license: "official", fields: [], data_quality: { quality_score: 0.9 },
}) as any;

const facilityRows = [{
  Year: 2024, "Emirate En": "Dubai", "Emirate Ar": "دبي", "Sector En": "Private", "Sector Ar": "خاص",
  "Main Category_En": "Hospital", "Main Category_Ar": "مستشفى", "Facility Type En": "General Hospital", "Facility Type Ar": "مستشفى عام", Total: 12,
}];
const indicatorRows = [{ "Indicator Name": "Life expectancy", "2022": 82.8, "2023": 83.4 }];
const industryRows = [{ ID: "1", CompanyName: "Factory", EmirateNameEN: "Dubai", Products: [] }];
const taxRows = [
  { Service_Name_EN: "Registration", Service_Name_AR: "تسجيل", Q1: 1, Q2: 2, Q3: 3, Q4: 4, "Grand Total": 10 },
  { Service_Name_EN: "Grand Total", Q1: 1, Q2: 2, Q3: 3, Q4: 4, "Grand Total": 10 },
];

const dependencies = {
  fetchHealthFacilitiesRecords: async () => result("mohap_health_facilities_2024", facilityRows),
  fetchHealthIndicatorsRecords: async () => result("mohap_health_core_indicators_2024", indicatorRows),
  fetchIndustryRecords: async () => result("moiat_industrial_licenses", industryRows, 100),
  fetchTaxRecords: async () => result("fta_service_activity_2025", taxRows),
} as const;

describe("evidence dossier service", () => {
  it("composes five canonically ordered pillars with source provenance", async () => {
    const loaded = await loadEvidenceDossier({ template: "evidence_brief", question: "What does official evidence show?", language: "en" }, dependencies as any);

    expect(loaded.data.pillars.map(({ id }) => id)).toEqual(["education", "health_facilities", "health_indicators", "industry", "tax_activity"]);
    expect(loaded.data.scope).toEqual({ pillarsRequested: 5, pillarsAvailable: 5, pillarsUnavailable: 0 });
    expect(loaded.meta).toMatchObject({ partial: false, available_pillars: 5, unavailable_pillars: 0 });
    expect(loaded.data.pillars[0]).toMatchObject({ delivery: "verified_snapshot", sourceIds: ["fcsc_unified_uae_numbers_2025"] });
    expect(loaded.data.pillars[1]).toMatchObject({ fact: { en: expect.stringContaining("12") }, citation: "https://example.test/mohap_health_facilities_2024" });
    expect(loaded.data.pillars[4]).toMatchObject({ fact: { en: expect.stringContaining("10") }, period: "2025" });
    expect(loaded.data.citations).toHaveLength(5);
  });

  it("starts all live pillar fetches in parallel", async () => {
    const started: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const delayed = (id: string, value: any) => async () => { started.push(id); await gate; return value; };
    const loading = loadEvidenceDossier({}, {
      fetchHealthFacilitiesRecords: delayed("facilities", result("mohap_health_facilities_2024", facilityRows)) as any,
      fetchHealthIndicatorsRecords: delayed("indicators", result("mohap_health_core_indicators_2024", indicatorRows)) as any,
      fetchIndustryRecords: delayed("industry", result("moiat_industrial_licenses", industryRows)) as any,
      fetchTaxRecords: delayed("tax", result("fta_service_activity_2025", taxRows)) as any,
    });
    await Promise.resolve();
    expect(started.sort()).toEqual(["facilities", "indicators", "industry", "tax"]);
    release();
    await loading;
  });

  it("isolates an unavailable pillar without turning it into zero", async () => {
    const down = async () => { throw new Error("industry upstream down"); };
    const loaded = await loadEvidenceDossier({}, { ...dependencies, fetchIndustryRecords: down } as any);
    const industry = loaded.data.pillars.find(({ id }) => id === "industry");

    expect(loaded.meta).toMatchObject({ partial: true, available_pillars: 4, unavailable_pillars: 1 });
    expect(industry).toMatchObject({ delivery: "unavailable", fact: { en: "Evidence unavailable for this request." } });
    expect(industry?.scope.en).toContain("industry upstream down");
    expect(industry?.limitations[0]?.en).toContain("No value or zero");
  });

  it("caps public limits before calling or shaping bounded sources", async () => {
    let industryLimit = 0;
    const loaded = await loadEvidenceDossier({ healthFacilitiesLimit: 999, healthIndicatorsLimit: 999, industryLimit: 999 }, {
      ...dependencies,
      fetchIndustryRecords: (async (_source: unknown, options: any) => { industryLimit = options.limit; return result("moiat_industrial_licenses", industryRows); }) as any,
    } as any);

    expect(industryLimit).toBe(100);
    expect(loaded.meta.limits).toEqual({ healthFacilities: 200, healthIndicators: 50, industry: 100 });
    expect(loaded.data.pillars.find(({ id }) => id === "health_indicators")?.scope.en).toContain("1 of 1");
  });

  it("qualifies a flagged latest health observation without changing its raw value", async () => {
    const flaggedRows = [{ "Indicator Name": "Population size", "2020": 9_282_410, "2021": 9_557_000, "2022": null, "2023": 10_679 }];
    const loaded = await loadEvidenceDossier({ pillars: ["education", "health_indicators"], query: "population" }, {
      fetchHealthIndicatorsRecords: async () => result("mohap_health_core_indicators_2024", flaggedRows),
    } as any);
    const health = loaded.data.pillars.find(({ id }) => id === "health_indicators");

    expect(health?.fact.en).toContain("10679");
    expect(health?.fact.en).toContain("QUALITY WARNING");
    expect(health?.fact.ar).toContain("تحذير جودة");
    expect(health?.quality).toEqual({ status: "warning", flags: [{ code: "relative_outlier", years: [2023] }] });
    expect(health?.limitations).toContainEqual({
      en: expect.stringContaining("relative outlier"),
      ar: expect.stringContaining("قيمة شاذة نسبيًا"),
    });
    expect(loaded.data.limitations).toContainEqual(expect.objectContaining({ en: expect.stringContaining("relative outlier") }));
  });

  it("keeps the verified-snapshot limitation aligned in both languages", async () => {
    const loaded = await loadEvidenceDossier({ pillars: ["education", "health_indicators"], query: "population" }, {
      fetchHealthIndicatorsRecords: async () => { throw new Error("MOHAP unavailable"); },
    } as any);
    const snapshotLimitation = loaded.data.pillars
      .find(({ id }) => id === "health_indicators")
      ?.limitations.find(({ en }) => en.includes("verified snapshot"));

    expect(snapshotLimitation?.ar).toContain("النسخة الموثقة");
    expect(snapshotLimitation?.ar).toContain("المصدر الحي");
    expect(snapshotLimitation?.ar).not.toContain("أعلام الجودة");
  });

  it("loads only the selected two-to-five pillars", async () => {
    let unexpectedCalls = 0;
    const unexpected = async () => { unexpectedCalls += 1; throw new Error("must not load"); };
    const loaded = await loadEvidenceDossier({ pillars: ["education", "tax_activity"] }, {
      fetchHealthFacilitiesRecords: unexpected as any,
      fetchHealthIndicatorsRecords: unexpected as any,
      fetchIndustryRecords: unexpected as any,
      fetchTaxRecords: dependencies.fetchTaxRecords as any,
    });

    expect(loaded.data.pillars.map(({ id }) => id)).toEqual(["education", "tax_activity"]);
    expect(loaded.data.scope).toEqual({ pillarsRequested: 2, pillarsAvailable: 2, pillarsUnavailable: 0 });
    expect(unexpectedCalls).toBe(0);
    expect(loaded.meta.filters.pillars).toEqual(["education", "tax_activity"]);
  });

  it("rejects a selection with fewer than two unique pillars", async () => {
    expect(loadEvidenceDossier({ pillars: ["education", "education"] }, dependencies as any)).rejects.toThrow("2-5 unique");
  });

  it("rejects unsupported pillar ids before starting any source request", async () => {
    let calls = 0;
    await expect(loadEvidenceDossier({ pillars: ["education", "unknown" as any] }, { fetchIndustryRecords: async () => { calls += 1; return result("industry", []); } })).rejects.toThrow("unsupported");
    expect(calls).toBe(0);
  });
});
