import { describe, expect, it } from "bun:test";
import { buildHealthFacilitiesAtlas } from "../src/health-facilities.js";

const rows = [
  { Year: 2024, "Emirate En": "Dubai", "Emirate Ar": "دبي", "Geo Coordinates": "25.20° N, 55.27° E", "Sector En": "Private", "Sector Ar": "خاص", "Main Category_En": "Medical Facilities", "Main Category_Ar": "المنشآت الصحية", "Facility Type En": "Clinic", "Facility Type Ar": "عيادة", Total: 30 },
  { Year: 2024, "Emirate En": "Dubai", "Emirate Ar": "دبي", "Geo Coordinates": "25.20° N, 55.27° E", "Sector En": "Government", "Sector Ar": "حكومي", "Main Category_En": "Medical Facilities", "Main Category_Ar": "المنشآت الصحية", "Facility Type En": "Hospital", "Facility Type Ar": "مستشفى", Total: 5 },
  { Year: 2024, "Emirate En": "Abu Dhabi", "Emirate Ar": "أبو ظبي", "Geo Coordinates": "24.45° N, 54.37° E", "Sector En": "Private", "Sector Ar": "خاص", "Main Category_En": "Medical Facilities", "Main Category_Ar": "المنشآت الصحية", "Facility Type En": "Clinic", "Facility Type Ar": "عيادة", Total: 20 },
  { Year: 2023, "Emirate En": "Dubai", "Emirate Ar": "دبي", "Geo Coordinates": "25.20° N, 55.27° E", "Sector En": "Private", "Sector Ar": "خاص", "Main Category_En": "Medical Facilities", "Main Category_Ar": "المنشآت الصحية", "Facility Type En": "Clinic", "Facility Type Ar": "عيادة", Total: 25 },
];

describe("UAE Health Facilities Atlas", () => {
  it("keeps aggregate rows honest and defaults to the latest published year", () => {
    const atlas = buildHealthFacilitiesAtlas(rows, { citation: "https://mohap.gov.ae/open-data", fetchedAt: "2026-07-17T00:00:00Z" });
    expect(atlas.scope).toMatchObject({ publishedRows: 4, selectedYear: 2024, matchedRows: 3, publishedFacilityCount: 55 });
    expect(atlas.emirates).toEqual([
      expect.objectContaining({ nameEn: "Dubai", publishedFacilityCount: 35 }),
      expect.objectContaining({ nameEn: "Abu Dhabi", publishedFacilityCount: 20 }),
    ]);
    expect(atlas.timeline).toEqual([{ year: 2023, publishedFacilityCount: 25 }, { year: 2024, publishedFacilityCount: 55 }]);
    expect(atlas.evidence.unit).toBe("published aggregate facility count");
    expect(atlas.limitations.join(" ")).toContain("not facility locations");
  });

  it("filters by source-native dimensions without mutating the input", () => {
    const before = structuredClone(rows);
    const atlas = buildHealthFacilitiesAtlas(rows, { citation: "x", fetchedAt: "x", year: 2024, emirate: "Dubai", sector: "Private", query: "clinic" });
    expect(atlas.scope).toMatchObject({ matchedRows: 1, publishedFacilityCount: 30 });
    expect(atlas.facilityTypes[0]).toMatchObject({ nameEn: "Clinic", nameAr: "عيادة", publishedFacilityCount: 30 });
    expect(rows).toEqual(before);
  });

  it("rejects malformed or negative aggregate rows instead of silently counting them", () => {
    expect(() => buildHealthFacilitiesAtlas([{ ...rows[0], Total: -1 }], { citation: "x", fetchedAt: "x" })).toThrow("invalid health facilities row");
  });
});
