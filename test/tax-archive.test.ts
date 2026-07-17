import { describe, expect, it } from "bun:test";
import { buildTaxArchive } from "../src/tax-archive.js";

describe("FTA source-native archive", () => {
  it("keeps incompatible periods separate and disables comparison", () => {
    const archive = buildTaxArchive([
      { sourceId: "fta_selected_services_2017_2022", period: "2017–2022", records: [{ Services: "Total VAT Registrants", 2022: 100 }], citation: "https://tax.gov.ae/2022.xlsx", fetchedAt: "2026-07-17T00:00:00Z" },
      { sourceId: "fta_service_activity_2024", period: "2024", records: [{ Service: "VAT Registration", Jan: 10, Unlabelled_After_Mar: 10 }], citation: "https://tax.gov.ae/2024.xlsx", fetchedAt: "2026-07-17T00:00:00Z" },
      { sourceId: "fta_service_activity_2025", period: "2025", records: [{ Service_Name_EN: "Grand Total", "Grand Total": 20 }], citation: "https://tax.gov.ae/2025.xlsx", fetchedAt: "2026-07-17T00:00:00Z" },
    ]);
    expect(archive.comparison).toEqual({ status: "unavailable", missingPeriods: ["2023"] });
    expect(archive.views).toHaveLength(3);
    expect(archive.warnings).toContain("The 2024 workbook contains an unlabelled column after March and a duplicate service label; no annual total is calculated.");
  });
});
