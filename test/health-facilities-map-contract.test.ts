import { describe, expect, it } from "bun:test";
import { openApiDocument } from "../src/openapi.js";
import { trustManifest } from "../src/manifest.js";

describe("Health Facilities Map discovery contract", () => {
  it("is listed in OpenAPI and the trust manifest", () => {
    const document = openApiDocument("https://uaemcp.zad.tools") as any;
    expect(document.paths["/api/v1/health-facilities-map"].get.operationId).toBe("getHealthFacilitiesMap");
    const manifest = trustManifest() as any;
    expect(manifest.tools.read).toContain("uae_health_facilities_map");
    expect(manifest.endpoints.healthFacilitiesMapApi).toBe("/api/v1/health-facilities-map");
  });
});
