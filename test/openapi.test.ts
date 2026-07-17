import { describe, expect, it } from "bun:test";
import { openApiDocument } from "../src/openapi.js";

describe("OpenAPI contract", () => {
  it("publishes stable operation ids for SDK generation", () => {
    const document = openApiDocument("https://uae.example") as any;
    expect(document.openapi).toBe("3.1.0");
    expect(document.servers[0].url).toBe("https://uae.example");
    const operations = Object.values(document.paths).flatMap((path: any) => Object.values(path).map((operation: any) => operation.operationId));
    expect(operations).toEqual(expect.arrayContaining(["getCoverage", "listSources", "search", "getRecords", "getDatasetSchema", "listRecipes", "listIndicators", "getIndicator", "resolveEntities", "getTileJson", "spatialJoin", "getObservatoryReport", "listObservatoryIncidents", "getObservatorySource", "getIndustryAtlas"]));
    expect(new Set(operations).size).toBe(operations.length);
  });
});
