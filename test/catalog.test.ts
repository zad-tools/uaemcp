import { describe, expect, it } from "bun:test";
import { capabilitiesFor, coverageSummary, portalModel } from "../src/catalog.js";
import { REGISTRY } from "../src/sources.js";

describe("unified catalog", () => {
  it("distinguishes live and metadata-only capabilities", () => {
    expect(capabilitiesFor(REGISTRY.get("ajman_data_portal")).records).toBe(true);
    expect(capabilitiesFor(REGISTRY.get("dubai_land_department")).records).toBe(false);
  });

  it("exposes explicit portal and organization concepts", () => {
    const portal = portalModel(REGISTRY.get("ajman_data_portal"));
    expect(portal.type).toBe("portal");
    expect(portal.organization).toBeDefined();
    expect(portal.capabilities).toBeDefined();
  });

  it("reports conservative coverage instead of one inflated source count", () => {
    expect(coverageSummary()).toMatchObject({
      officialPortalsIndexed: 32,
      liveRecordConnectors: 2,
      blockedConnectors: 1,
      keyRequiredPortals: 3,
    });
  });
});
