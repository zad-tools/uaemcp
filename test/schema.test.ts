import { describe, expect, it } from "bun:test";
import { expandQuery, normalizeText, recognizeConcepts } from "../src/glossary.js";
import { inferSchema } from "../src/schema.js";

describe("dataset schema", () => {
  it("infers types, nullability, uniqueness and statistics", () => {
    const schema = inferSchema([
      { EmirateNameEN: "Dubai", value: 10 },
      { EmirateNameEN: "Abu Dhabi", value: 20 },
      { EmirateNameEN: "Ajman", value: null },
    ]);
    const emirate = schema.fields.find((field) => field.name === "EmirateNameEN");
    const value = schema.fields.find((field) => field.name === "value");
    expect(emirate?.semanticType).toBe("emirate");
    expect(emirate?.uniqueInSample).toBe(true);
    expect(value?.nullable).toBe(true);
    expect(value?.statistics).toMatchObject({ min: 10, max: 20 });
  });
});

describe("bilingual glossary", () => {
  it("normalizes Arabic spelling variants", () => {
    expect(normalizeText("إمارة أبوظبي")).toBe("اماره ابوظبي");
  });
  it("expands cross-language concepts", () => {
    expect(expandQuery("رخصة صناعية")).toContain("industrial license");
  });
  it("recognizes bilingual query entities", () => {
    expect(recognizeConcepts("عقارات ومصانع في الإمارات")).toEqual(["emirate", "industrial_license", "real_estate"]);
  });
  it("covers UAE government and domain concepts in both languages", () => {
    expect(recognizeConcepts("جهة حكومية ونشاط اقتصادي ونوع العقار")).toEqual(expect.arrayContaining([
      "government_agency", "business_activity", "property_type",
    ]));
    expect(recognizeConcepts("municipality city district licence type")).toEqual(expect.arrayContaining([
      "government_agency", "city", "administrative_region", "license_type",
    ]));
  });
});
