import { describe, expect, it } from "bun:test";
import { buildAjmanParksEvidence } from "../src/ajman-parks.js";

describe("Ajman Parks Footfall", () => {
  it("aggregates valid source-published visit observations without calling them people", () => {
    const report = buildAjmanParksEvidence([
      { year: 2023, month_en: "January", month_ar: "يناير", park_name_en: "A", park_name_ar: "أ", numne_of_parks_visitors: "10" },
      { year: 2023, month_en: "February", month_ar: "فبراير", park_name_en: "A", park_name_ar: "أ", numne_of_parks_visitors: "15" },
      { year: 2022, month_en: "January", month_ar: "يناير", park_name_en: "B", park_name_ar: "ب", numne_of_parks_visitors: "-" },
    ], { fetchedAt: "2026-05-13T10:47:26.040Z", delivery: "live", upstreamRecords: 3 });
    expect(report.summary).toEqual({ publishedVisitObservations: 25, validRows: 2, excludedRows: 1, years: 1, parks: 1 });
    expect(report.annual).toEqual([{ year: 2023, visits: 25 }]);
    expect(report.parks[0]).toMatchObject({ nameEn: "A", nameAr: "أ", visits: 25 });
    expect(report.limitations.join(" ")).toContain("not unique people");
  });

  it("rejects malformed years and negative visit values", () => {
    const report = buildAjmanParksEvidence([
      { year: 1800, park_name_en: "A", park_name_ar: "أ", numne_of_parks_visitors: "5" },
      { year: 2023, park_name_en: "A", park_name_ar: "أ", numne_of_parks_visitors: "-1" },
    ], { fetchedAt: "2026-05-13T10:47:26.040Z", delivery: "snapshot", upstreamRecords: 2 });
    expect(report.summary.validRows).toBe(0);
    expect(report.summary.excludedRows).toBe(2);
    expect(report.delivery).toBe("verified_snapshot");
  });
});
