import { describe, expect, it } from "bun:test";
import { capabilitiesFor, coverageSummary, datasetModel, portalModel } from "../src/catalog.js";
import { REGISTRY } from "../src/sources.js";

describe("unified catalog", () => {
  it("distinguishes live and metadata-only capabilities", () => {
    expect(capabilitiesFor(REGISTRY.get("ajman_data_portal")).records).toBe(true);
    expect(capabilitiesFor(REGISTRY.get("dubai_land_department")).records).toBe(false);
  });

  it("derives dataset discovery from the connector contract", () => {
    expect(capabilitiesFor({ ...REGISTRY.get("moiat_industrial_licenses"), kind: "rss" }).datasets).toBe(true);
    expect(capabilitiesFor({ ...REGISTRY.get("moiat_industrial_licenses"), kind: "graphql" }).datasets).toBe(false);
  });

  it("exposes explicit portal and organization concepts", () => {
    const portal = portalModel(REGISTRY.get("ajman_data_portal"));
    expect(portal.type).toBe("portal");
    expect(portal.organization).toBeDefined();
    expect(portal.capabilities).toBeDefined();
  });

  it("reports conservative coverage instead of one inflated source count", () => {
    expect(coverageSummary()).toMatchObject({
      officialPortalsIndexed: 37,
      liveRecordConnectors: 7,
      queryableDatasetsKnownMinimum: 216,
      blockedConnectors: 1,
      keyRequiredPortals: 3,
    });
  });

  it("adds dataset-level license, freshness and capabilities", () => {
    const dataset = datasetModel({ id: "d", title_en: "D", title_ar: "", records_count: 1, theme: "", modified: "2026-01-01T00:00:00Z", has_geo: true }, REGISTRY.get("ajman_data_portal"), Date.parse("2026-01-10T00:00:00Z"));
    expect(dataset.type).toBe("dataset");
    expect(dataset.license).toBeDefined();
    expect(dataset.freshness).toMatchObject({ ageDays: 9, status: "current" });
  });
});
