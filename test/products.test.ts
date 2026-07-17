import { describe, expect, it } from "bun:test";
import { listProducts } from "../src/products.js";
import { handleRest } from "../src/rest.js";
import { openApiDocument } from "../src/openapi.js";

describe("public product registry", () => {
  it("publishes every evidence product with bilingual copy and working route contracts", async () => {
    const products = listProducts();
    const paths = Object.keys((openApiDocument().paths ?? {}) as Record<string, unknown>);
    expect(products).toHaveLength(7);
    expect(products.map((product) => product.id)).toEqual([
      "health_indicators", "trade_flow_radar", "industry_atlas", "tax_service_activity", "fta_archive", "place_names", "open_data_observatory",
    ]);
    for (const product of products) {
      expect(product).toMatchObject({ status: "published", access: "public" });
      expect(product.title.en.length).toBeGreaterThan(3);
      expect(product.title.ar.length).toBeGreaterThan(3);
      expect(product.webPath).toStartWith("/");
      expect(product.apiPath).toStartWith("/api/v1/");
      expect(product.evidence.scope.en.length).toBeGreaterThan(5);
      expect(product.evidence.scope.ar.length).toBeGreaterThan(5);
      expect(product.evidence.limitations.length).toBeGreaterThan(0);
      const page = await handleRest(new Request(`http://localhost${product.webPath}`));
      expect(page?.status).toBe(200);
      const apiIsDocumented = paths.some((path) => path === product.apiPath || (path.includes("{sourceId}") && product.apiPath.endsWith("/records")));
      expect(apiIsDocumented).toBe(true);
    }
  });
});
