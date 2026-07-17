import { describe, expect, it } from "bun:test";
import { healthIndicatorsPage } from "../src/health-indicators-web.js";
import { industryAtlasPage } from "../src/industry-atlas-web.js";
import { observatoryPage } from "../src/observatory-web.js";
import { placesExplorerPage } from "../src/places-web.js";
import { taxArchivePage } from "../src/tax-archive-web.js";
import { taxServicesPage } from "../src/tax-services-web.js";
import { tradeFlowPage } from "../src/trade-flow-web.js";
import { landingPage } from "../src/web.js";
import { handleRest } from "../src/rest.js";

const pages = [
  ["/", landingPage],
  ["/observatory", observatoryPage],
  ["/industry-atlas", industryAtlasPage],
  ["/places", placesExplorerPage],
  ["/tax-services", taxServicesPage],
  ["/tax-services/archive", taxArchivePage],
  ["/trade-flow", tradeFlowPage],
  ["/health-indicators", healthIndicatorsPage],
] as const;

describe("Dubai Font public brand contract", () => {
  it("uses Dubai Font for every public interface in both writing directions", () => {
    for (const [, render] of pages) {
      const html = render();
      expect(html).toContain('font-family:"Dubai"');
      expect(html).toContain("html[dir=rtl] body");
      expect(html).toContain("Dubai-Regular.woff");
      expect(html).toContain("Dubai-Bold.woff");
    }
  });

  it("allows the Dubai Font origin in every public interface CSP", async () => {
    for (const [path] of pages) {
      const response = await handleRest(new Request(`http://localhost${path}`));
      expect(response?.status).toBe(200);
      expect(response?.headers.get("content-security-policy")).toContain("font-src");
      expect(response?.headers.get("content-security-policy")).toContain("https://dubaihumanitarian.ae");
    }
  });
});
