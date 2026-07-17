import { describe, expect, it } from "bun:test";
import { buildAjmanUrbanEvidence } from "../src/ajman-urban.js";

describe("Ajman Urban Evidence", () => {
  it("keeps six official urban datasets separate and preserves their units", () => {
    const report = buildAjmanUrbanEvidence([
      { dataset: "licenses-issued-for-new-buildings-by-number-of-buildings", records: [{ year: 2024, category_1_en: "Residential buildings", category_1_ar: "مباني سكنية", value: 12 }], total: 1 },
      { dataset: "building-licenses-by-license-type", records: [{ year: 2024, type_of_license_ar: "New", type_of_license_en: "جديد", building_licenses_issued_classified_by_license_type_in_the_emirate_of_ajman: 20 }], total: 1 },
      { dataset: "certified-rent-contracts-in-ajman", records: [{ year: 2024, contract_category_en: "Commercial", contract_category_ar: "تجاري", total_of_certified_rent_contracts_in_ajman_city: 30 }], total: 1 },
      { dataset: "certified-rent-contracts-in-masfoot", records: [{ year: "2024", contract_category_en: "Residential", contract_category_ar: "سكني", total_of_certified_rent_contracts_in_masfout_city: "4" }], total: 1 },
      { dataset: "the-length-of-the-new-roads-added-in-the-emirate", records: [{ year: 2024, the_length_of_the_new_road_added_in_the_emirate_km: 8.5 }], total: 1 },
      { dataset: "developed-crossroads", records: [{ year: 2024, total_number_of_developed_crossroads: 6 }], total: 1 },
    ], { citation: "https://data.ajman.ae", fetchedAt: "2026-07-17T00:00:00Z" });
    expect(report.scope.datasets).toHaveLength(6);
    expect(report.views.newBuildings.annual[0]).toMatchObject({ year: 2024, value: 12, unit: "buildings" });
    expect(report.views.buildingLicenses.types[0]).toMatchObject({ nameEn: "New", nameAr: "جديد", value: 20 });
    expect(report.views.ajmanRent.annual[0]).toMatchObject({ value: 30, unit: "certified contracts" });
    expect(report.views.masfoutRent.annual[0]).toMatchObject({ value: 4 });
    expect(report.views.roads.annual[0]).toMatchObject({ value: 8.5, unit: "km" });
    expect(report.views.crossroads.annual[0]).toMatchObject({ value: 6, unit: "developed crossroads" });
    expect(report.limitations.join(" ")).toContain("must not be combined");
  });
});
