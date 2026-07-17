import { describe, expect, it } from "bun:test";
import { SourceNotFound, ValidationError } from "../src/errors.js";
import { REGISTRY } from "../src/sources.js";
import { Registry } from "../src/sources.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

  it("persists a validated custom connector source", () => {
    const directory = mkdtempSync(join(tmpdir(), "uaemcp-registry-"));
    const path = join(directory, "sources.json");
    try {
      const registry = new Registry(path);
      const added = registry.addSource({
        id: "health_csv", name_en: "Health CSV", name_ar: "بيانات الصحة",
        owner: "Test Authority", base_url: "https://example.gov.ae/data.csv", kind: "csv",
        connector_config: { delimiter: "," },
      });
      expect(added).toMatchObject({ kind: "csv", access_status: "live", origin: "custom" });
      expect(new Registry(path).get("health_csv").connector_config).toEqual({ delimiter: "," });
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it("rejects unsafe custom source definitions", () => {
    const registry = new Registry(join(tmpdir(), `uaemcp-missing-${crypto.randomUUID()}.json`));
    expect(() => registry.addSource({ id: "Bad ID", name_en: "x", name_ar: "x", owner: "x", base_url: "file:///etc/passwd", kind: "csv" })).toThrow(ValidationError);
  });
});
