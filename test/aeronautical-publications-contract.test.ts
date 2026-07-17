import { describe, expect, it } from "bun:test";
import { REGISTRY } from "../src/sources.js";
import { listProducts } from "../src/products.js";
import { openApiDocument } from "../src/openapi.js";
import { trustManifest } from "../src/manifest.js";

describe("GCAA Aeronautical Publications discovery contract", () => {
  it("registers the official source, product, OpenAPI operation and MCP tool", () => {
    expect(REGISTRY.get("gcaa_current_aip_publications")).toMatchObject({ owner: "UAE General Civil Aviation Authority", access_status: "live" });
    expect(listProducts().find(({ id }) => id === "aeronautical_publications")).toMatchObject({ webPath: "/aeronautical-publications", apiPath: "/api/v1/aeronautical-publications" });
    expect((openApiDocument() as any).paths["/api/v1/aeronautical-publications"].get.operationId).toBe("getAeronauticalPublications");
    const manifest = trustManifest() as any;
    expect(manifest.tools.read).toContain("uae_aeronautical_publications");
    expect(manifest.endpoints.aeronauticalPublicationsApi).toBe("/api/v1/aeronautical-publications");
  });
});
