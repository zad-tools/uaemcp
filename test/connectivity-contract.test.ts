import { describe, expect, it } from "bun:test";
import { openApiDocument } from "../src/openapi.js";
import { trustManifest } from "../src/manifest.js";

describe("Connectivity Pulse public discovery", () => {
  it("is discoverable through OpenAPI and the trust manifest", () => {
    const document = openApiDocument("https://uaemcp.zad.tools") as any;
    const operation = document.paths["/api/v1/connectivity"].get;
    expect(operation.operationId).toBe("getConnectivityPulse");
    expect(operation.parameters.find((item: any) => item.name === "series").schema.enum).toHaveLength(3);

    const manifest = trustManifest() as any;
    expect(manifest.tools.read).toContain("uae_connectivity_pulse");
    expect(manifest.endpoints.connectivityApi).toBe("/api/v1/connectivity");
  });
});
