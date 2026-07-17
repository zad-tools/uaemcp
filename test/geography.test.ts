import { describe, expect, it } from "bun:test";
import { normalizeEmirate, normalizeGeography, resolveEntityKey } from "../src/geography.js";

describe("UAE geography normalization", () => {
  it("normalizes Arabic, English and code aliases", () => {
    expect(normalizeEmirate("أبو ظبي")).toMatchObject({ id: "abu_dhabi", en: "Abu Dhabi", ar: "أبوظبي" });
    expect(normalizeEmirate("DXB")?.id).toBe("dubai");
    expect(normalizeEmirate("Ras al-Khaimah")?.id).toBe("ras_al_khaimah");
    expect(normalizeEmirate("unknown")).toBeNull();
  });

  it("adds non-destructive normalized geography and stable entity keys", () => {
    const original = { EmirateNameAR: "دبي", CompanyName: "Acme مصنع" };
    const normalized = normalizeGeography(original);
    expect(normalized).toMatchObject({ EmirateNameAR: "دبي", _normalized: { emirate: { id: "dubai" } } });
    expect(original).not.toHaveProperty("_normalized");
    expect(resolveEntityKey(original, ["CompanyName", "EmirateNameAR"])).toBe(resolveEntityKey({ CompanyName: "ACME مصنع", EmirateNameAR: "Dubai" }, ["CompanyName", "EmirateNameAR"]));
  });
});
