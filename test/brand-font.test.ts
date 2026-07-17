import { describe, expect, it } from "bun:test";
import { healthIndicatorsPage } from "../src/health-indicators-web.js";
import { industryAtlasPage } from "../src/industry-atlas-web.js";
import { observatoryPage } from "../src/observatory-web.js";
import { placesExplorerPage } from "../src/places-web.js";
import { taxArchivePage } from "../src/tax-archive-web.js";
import { taxServicesPage } from "../src/tax-services-web.js";
import { tradeFlowPage } from "../src/trade-flow-web.js";
import { landingPage } from "../src/web.js";
import { educationLedgerPage } from "../src/education-ledger-web.js";
import { handleRest } from "../src/rest.js";
import { goldenResidencyPage } from "../src/golden-residency-web.js";
import { businessSetupPage } from "../src/business-setup-web.js";
import { startupSupportPage } from "../src/startup-support-web.js";
import { founderPathwayPage } from "../src/founder-pathway-web.js";

const pages = [
  ["/founder-pathway", founderPathwayPage],
  ["/startup-support", startupSupportPage],
  ["/business-setup", businessSetupPage],
  ["/golden-residency", goldenResidencyPage],
  ["/", landingPage],
  ["/observatory", observatoryPage],
  ["/industry-atlas", industryAtlasPage],
  ["/places", placesExplorerPage],
  ["/tax-services", taxServicesPage],
  ["/tax-services/archive", taxArchivePage],
  ["/trade-flow", tradeFlowPage],
  ["/health-indicators", healthIndicatorsPage],
  ["/education", educationLedgerPage],
] as const;

describe("Dubai Font public brand contract", () => {
  it("uses Dubai Font for every public interface in both writing directions", () => {
    for (const [, render] of pages) {
      const html = render();
      expect(html).toContain('font-family:"Dubai"');
      expect(html).toMatch(/html\[dir=rtl\] body|\*\{box-sizing:border-box;font-family:"Dubai"/);
      expect(html).toContain('html body *{font-family:"Dubai",Arial,sans-serif!important}');
      expect(html).toMatch(/url\(["']\/assets\/fonts\/Dubai-Regular\.woff["']\)/);
      expect(html).toMatch(/url\(["']\/assets\/fonts\/Dubai-Bold\.woff["']\)/);
      expect(html).not.toContain("https://dubaihumanitarian.ae/fonts/");
      expect(html).not.toContain("fonts.googleapis.com");
    }
  });

  it("keeps every public product typography entirely on Dubai Font", () => {
    for (const [, render] of pages) {
      expect(render()).toContain('html body *{font-family:"Dubai",Arial,sans-serif!important}');
    }
  });

  it("loads the tax activity font from the same trusted origin", async () => {
    const html = taxServicesPage();
    expect(html).toContain('url("/assets/fonts/Dubai-Regular.woff")');
    expect(html).toContain('url("/assets/fonts/Dubai-Bold.woff")');
    const response = await handleRest(new Request("http://localhost/tax-services"));
    expect(response?.headers.get("content-security-policy")).toContain("font-src 'self'");
  });

  it("restricts every public interface to the same-origin Dubai Font", async () => {
    for (const [path] of pages) {
      const response = await handleRest(new Request(`http://localhost${path}`));
      expect(response?.status).toBe(200);
      expect(response?.headers.get("content-security-policy")).toContain("font-src 'self'");
      expect(response?.headers.get("content-security-policy")).not.toContain("https://dubaihumanitarian.ae");
      expect(response?.headers.get("content-security-policy")).not.toContain("fonts.gstatic.com");
    }
  });

  it("serves both Dubai Font weights for GET and HEAD requests", async () => {
    for (const path of ["/assets/fonts/Dubai-Regular.woff", "/assets/fonts/Dubai-Bold.woff"]) {
      const getResponse = await handleRest(new Request(`http://localhost${path}`));
      expect(getResponse?.status).toBe(200);
      expect(getResponse?.headers.get("content-type")).toBe("font/woff");

      const headResponse = await handleRest(new Request(`http://localhost${path}`, { method: "HEAD" }));
      expect(headResponse?.status).toBe(200);
      expect(headResponse?.headers.get("content-type")).toBe("font/woff");
      expect(await headResponse?.text()).toBe("");
    }
  });
});
