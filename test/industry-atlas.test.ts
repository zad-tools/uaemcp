import { describe, expect, it } from "bun:test";
import { buildIndustryAtlas } from "../src/industry-atlas.js";

const records = [
  { ID: "1", CompanyName: "Alpha Metals", EmirateNameEN: "Abu Dhabi", EmirateNameAR: "أبوظبي", AreaNameEN: "Musaffah", AreaNameAR: "مصفح", Latitude: "24.35", Longitude: "54.50", Products: [{ ProductNameEN: "Steel pipes", ProductNameAR: "أنابيب فولاذية" }] },
  { ID: "2", CompanyName: "Beta Steel", EmirateNameEN: "Abu Dhabi", EmirateNameAR: "أبوظبي", AreaNameEN: "ICAD", AreaNameAR: "آيكاد", Latitude: "24.30", Longitude: "54.55", Products: [{ ProductNameEN: "Steel pipes", ProductNameAR: "أنابيب فولاذية" }, { ProductNameEN: "Wire", ProductNameAR: "أسلاك" }] },
  { ID: "3", CompanyName: "Gamma Foods", EmirateNameEN: "Dubai", EmirateNameAR: "دبي", AreaNameEN: "Al Quoz", AreaNameAR: "القوز", Products: [{ ProductNameEN: "Prepared foods", ProductNameAR: "أغذية محضرة" }] },
];

describe("UAE Industry Atlas", () => {
  it("builds an honest evidence slice from a bounded official sample", () => {
    const atlas = buildIndustryAtlas(records, {
      sourceId: "moiat_industrial_licenses",
      citation: "https://moiat.gov.ae/en/open-data",
      fetchedAt: "2026-07-17T00:00:00Z",
      upstreamTotal: null,
      qualityScore: 0.79,
    });

    expect(atlas.scope).toEqual({ sampleSize: 3, upstreamTotal: null, coverageRatio: null, completePopulation: false });
    expect(atlas.summary).toEqual({ emiratesObserved: 2, areasObserved: 3, productLabelsObserved: 3, geocodedEstablishments: 2 });
    expect(atlas.emirates[0]).toMatchObject({ id: "abu_dhabi", nameEn: "Abu Dhabi", nameAr: "أبوظبي", establishments: 2, sharePercent: 66.67 });
    expect(atlas.products[0]).toMatchObject({ nameEn: "Steel pipes", establishments: 2 });
    expect(atlas.map).toHaveLength(2);
    expect(atlas.limitations).toContain("Counts describe the returned sample, not the full UAE industrial population.");
  });

  it("filters a slice without changing its evidence scope", () => {
    const atlas = buildIndustryAtlas(records, {
      sourceId: "moiat_industrial_licenses", citation: "official", fetchedAt: "2026-07-17T00:00:00Z",
      upstreamTotal: null, qualityScore: 0.79, emirate: "Dubai", query: "food",
    });
    expect(atlas.scope.sampleSize).toBe(1);
    expect(atlas.filters).toEqual({ emirate: "Dubai", query: "food" });
    expect(atlas.emirates[0].nameEn).toBe("Dubai");
  });
});
