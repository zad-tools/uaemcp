import { describe, expect, it } from "bun:test";
import { buildPlaceNamesProduct } from "../src/places.js";

describe("national place names product", () => {
  it("normalizes source-native FGIC records without inventing missing text", () => {
    const product = buildPlaceNamesProduct([
      {
        objectid: 7,
        gazetteername: "دبي",
        englishname: "Dubai",
        category: "مدينة",
        categoryeng: "City",
        description: "اسم مكان منشور",
        descriptioneng: "placeholder must never escape",
        _geometry: { type: "Point", coordinates: [55.2708, 25.2048] },
      },
      { objectid: 8, gazetteername: "جبل حفيت", englishname: null, point_x: 55.78, point_y: 24.06 },
    ], { query: "دبي", citation: "https://atlas.fgic.gov.ae/", fetchedAt: "2026-07-17T00:00:00.000Z" });

    expect(product.query).toBe("دبي");
    expect(product.returned).toBe(2);
    expect(product.mapped).toBe(2);
    expect(product.places[0]).toEqual({
      id: "fgic:7",
      name: { ar: "دبي", en: "Dubai" },
      category: { ar: "مدينة", en: "City" },
      description: { ar: "اسم مكان منشور", en: null },
      coordinates: { longitude: 55.2708, latitude: 25.2048 },
    });
    expect(product.places[1].name).toEqual({ ar: "جبل حفيت", en: null });
    expect(product.places[1].coordinates).toEqual({ longitude: 55.78, latitude: 24.06 });
    expect(JSON.stringify(product)).not.toContain("placeholder");
    expect(product.evidence).toMatchObject({ sourceId: "fgic_national_gazetteer", citation: "https://atlas.fgic.gov.ae/" });
    expect(product.limitations.en.length).toBeGreaterThan(2);
    expect(product.lineage.map((step) => step.operation)).toEqual(["fetch", "normalize_fgic_place_names"]);
  });

  it("rejects invalid coordinates instead of publishing misleading map points", () => {
    const product = buildPlaceNamesProduct([
      { objectid: 1, gazetteername: "اختبار", point_x: 999, point_y: 999 },
      { objectid: 2, gazetteername: "بدون إحداثيات" },
    ], { query: "اختبار", citation: "https://example.gov.ae", fetchedAt: "2026-07-17T00:00:00.000Z" });
    expect(product.mapped).toBe(0);
    expect(product.places.every((place) => place.coordinates === null)).toBe(true);
  });
});
