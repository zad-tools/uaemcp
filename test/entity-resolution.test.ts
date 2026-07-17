import { describe, expect, it } from "bun:test";
import { resolveEntities } from "../src/entity-resolution.js";

describe("cross-source entity resolution", () => {
  it("matches bilingual emirate aliases and normalized entity names", () => {
    const result = resolveEntities(
      [{ company: "ACME Factory", emirate: "أبو ظبي" }, { company: "Other", emirate: "دبي" }], ["company", "emirate"],
      [{ name: "acme factory", location: "Abu Dhabi" }, { name: "Third", location: "Dubai" }], ["name", "location"],
    );
    expect(result).toMatchObject({ leftMatched: 1, rightMatched: 1, leftUnmatched: 1, rightUnmatched: 1, truncated: false });
    expect(result.matches[0]).toMatchObject({ match: { method: "normalized_exact", confidence: 1 } });
  });

  it("validates field mappings and bounds one-to-many output", () => {
    expect(() => resolveEntities([], ["a"], [], ["b", "c"])).toThrow("equal length");
    const result = resolveEntities([{ id: "x" }], ["id"], [{ id: "x" }, { id: "x" }], ["id"], 1);
    expect(result.matches).toHaveLength(1);
    expect(result.truncated).toBe(true);
  });
});
