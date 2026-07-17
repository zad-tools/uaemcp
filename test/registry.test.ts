import { describe, expect, it } from "bun:test";
import { SourceNotFound, ValidationError } from "../src/errors.js";
import { REGISTRY } from "../src/sources.js";

describe("Registry", () => {
  it("lists 32 built-in sources", () => {
    expect(REGISTRY.list().length).toBe(32);
  });

  it("gets a known source", () => {
    const s = REGISTRY.get("moiat_industrial_licenses");
    expect(s.kind).toBe("http_json");
    expect(s.row_path).toEqual(["result", "Factories"]);
  });

  it("throws on an unknown source", () => {
    expect(() => REGISTRY.get("does_not_exist")).toThrow(SourceNotFound);
  });

  it("rejects a custom source missing required fields", () => {
    // deliberately invalid partial payload
    expect(() => REGISTRY.addMetadataSource({ id: "x" } as Record<string, string>)).toThrow(
      ValidationError,
    );
  });

  it("cannot override a built-in source", () => {
    expect(() =>
      REGISTRY.addMetadataSource({
        id: "moiat_industrial_licenses",
        name_en: "x",
        name_ar: "x",
        owner: "x",
        base_url: "https://example.com/",
      }),
    ).toThrow(ValidationError);
  });
});
