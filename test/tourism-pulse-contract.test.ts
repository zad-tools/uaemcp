import { describe, expect, it } from "bun:test";
import { trustManifest } from "../src/manifest.js";
import { openApiDocument } from "../src/openapi.js";
import { listProducts } from "../src/products.js";
import { REGISTRY } from "../src/sources.js";

describe("UAE Tourism Pulse public contract", () => {
  it("registers one official source, product, REST operation and MCP tool", () => {
    expect(REGISTRY.get("moet_tourism_2014_2025")).toMatchObject({ owner: "UAE Ministry of Economy and Tourism", kind: "xlsx", access_status: "live", category: "tourism" });
    expect(listProducts().find(({ id }) => id === "tourism_pulse")).toMatchObject({ webPath: "/tourism-pulse", apiPath: "/api/v1/tourism-pulse", sourceIds: ["moet_tourism_2014_2025"] });
    expect((openApiDocument() as any).paths["/api/v1/tourism-pulse"].get.operationId).toBe("getTourismPulse");
    const manifest = trustManifest() as any;
    expect(manifest.tools.read).toContain("uae_tourism_pulse");
    expect(manifest.endpoints.tourismPulseApi).toBe("/api/v1/tourism-pulse");
  });
});
