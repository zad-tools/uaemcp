import { describe, expect, it } from "bun:test";
import { trustManifest } from "../src/manifest.js";
import { openApiDocument } from "../src/openapi.js";
import { listProducts } from "../src/products.js";
import { REGISTRY } from "../src/sources.js";

describe("MOHRE Employment by Gender public contract", () => {
  it("registers the official source, product, REST operation and MCP tool", () => {
    expect(REGISTRY.get("mohre_employment_gender_2020_2024")).toMatchObject({
      owner: "Ministry of Human Resources and Emiratisation",
      category: "employment",
    });
    expect(listProducts().find(({ id }) => id === "employment_gender")).toMatchObject({
      webPath: "/employment-gender",
      apiPath: "/api/v1/employment-gender",
      sourceIds: ["mohre_employment_gender_2020_2024"],
    });
    expect((openApiDocument() as any).paths["/api/v1/employment-gender"].get.operationId).toBe("getEmploymentGender");
    const manifest = trustManifest() as any;
    expect(manifest.tools.read).toContain("uae_employment_gender");
    expect(manifest.endpoints.employmentGender).toBe("/employment-gender");
    expect(manifest.endpoints.employmentGenderApi).toBe("/api/v1/employment-gender");
  });
});
