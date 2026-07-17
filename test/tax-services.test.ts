import { describe, expect, it } from "bun:test";
import { buildTaxServiceReport } from "../src/tax-services.js";

const rows = [
  { Service_Name_EN: "Corporate Tax Registration", Service_Name_AR: "التسجيل في ضريبة الشركات", Q1: 50000, Q2: 55000, Q3: 65000, Q4: 57263, "Grand Total": 227263 },
  { Service_Name_EN: "VAT Registration", Service_Name_AR: "التسجيل في ضريبة القيمة المضافة", Q1: 20000, Q2: 22000, Q3: 25000, Q4: 23893, "Grand Total": 90893 },
  { Service_Name_EN: "Grand Total", Service_Name_AR: "المجموع الكلي", Q1: 84941, Q2: 83236, Q3: 97886, Q4: 88811, "Grand Total": 354874 },
];

describe("FTA service activity report", () => {
  it("uses the official total row and never double-counts it", () => {
    const report = buildTaxServiceReport(rows, {
      citation: "https://tax.gov.ae/en/open.data/open.data.aspx",
      fetchedAt: "2026-07-17T00:00:00.000Z",
    });

    expect(report).toMatchObject({
      kind: "fta_service_activity_2025",
      period: "2025",
      officialTotal: 354874,
      peakQuarter: { quarter: "Q3", count: 97886 },
      quarters: { Q1: 84941, Q2: 83236, Q3: 97886, Q4: 88811 },
      topService: { nameEn: "Corporate Tax Registration", total: 227263 },
      source: { sourceId: "fta_service_activity_2025" },
    });
    expect(report.services).toHaveLength(2);
    expect(report.services.some((service) => service.nameEn === "Grand Total")).toBe(false);
    expect(report.limitations.join(" ")).toContain("not tax revenue");
  });

  it("fails closed when the official total row is absent", () => {
    expect(() => buildTaxServiceReport(rows.slice(0, 2), { citation: "x", fetchedAt: "y" })).toThrow("official Grand Total row");
  });
});
