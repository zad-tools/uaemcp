import { describe, expect, it } from "bun:test";
import { buildAjmanBusinessEvidence } from "../src/ajman-business.js";

describe("Ajman Business Evidence", () => {
  it("keeps the three official dataset views separate while ranking their bounded samples", () => {
    const report = buildAjmanBusinessEvidence([
      { dataset: "license-in-ajman-activities", records: [
        { activitiyen: "Software Design", activitiyar: "تصميم البرمجيات", licensetypeen: "Professional License", licensetypear: "رخصة مهنية", legalformen: "LLC", legalformar: "ذ.م.م", startdate: "2024-01-01" },
        { activitiyen: "Software Design", activitiyar: "تصميم البرمجيات", licensetypeen: "Professional License", licensetypear: "رخصة مهنية", legalformen: "LLC", legalformar: "ذ.م.م", startdate: "2025-01-01" },
      ], total: 100 },
      { dataset: "license-in-ajman-area", records: [
        { areaen: "Ajman Industrial 2", areaar: "عجمان الصناعية 2", licensetypeen: "Trade License", licensetypear: "رخصة تجارية", legalformen: "LLC", legalformar: "ذ.م.م", startdate: "2025-02-01" },
      ], total: 200 },
      { dataset: "companies-by-license-type", records: [
        { license_type: "Commercial", company_status: "Active", license_state_date: "2025-03-01" },
        { license_type: "Commercial", company_status: "Suspended", license_state_date: "2024-03-01" },
      ], total: 300 },
    ], { citation: "https://data.ajman.ae", fetchedAt: "2026-07-17T00:00:00Z" });

    expect(report.scope.datasets).toEqual([
      expect.objectContaining({ id: "license-in-ajman-activities", sampledRecords: 2, upstreamRecords: 100 }),
      expect.objectContaining({ id: "license-in-ajman-area", sampledRecords: 1, upstreamRecords: 200 }),
      expect.objectContaining({ id: "companies-by-license-type", sampledRecords: 2, upstreamRecords: 300 }),
    ]);
    expect(report.views.activity.activities[0]).toMatchObject({ nameEn: "Software Design", nameAr: "تصميم البرمجيات", records: 2 });
    expect(report.views.activity.licenseTypes[0]).toMatchObject({ nameEn: "Professional License", records: 2 });
    expect(report.views.area.areas[0]).toMatchObject({ nameEn: "Ajman Industrial 2", records: 1 });
    expect(report.views.area.licenseTypes[0]).toMatchObject({ nameEn: "Trade License", records: 1 });
    expect(report.views.status.statuses).toEqual([
      expect.objectContaining({ nameEn: "Active", records: 1 }),
      expect.objectContaining({ nameEn: "Suspended", records: 1 }),
    ]);
    expect(report.views.activity.startYears[0]).toMatchObject({ year: 2025, observedRecords: 1 });
    expect(report.views.area.startYears[0]).toMatchObject({ year: 2025, observedRecords: 1 });
    expect(report.views.status.stateYears[0]).toMatchObject({ year: 2025, observedRecords: 1 });
    expect(report.limitations.join(" ")).toContain("not unique companies");
  });
});
