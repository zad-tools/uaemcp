import { describe, expect, it } from "bun:test";
import { applyPublicVisualSystem } from "../src/public-visual-system.js";
import { handleRest } from "../src/rest.js";

const publicRoutes = [
  "/", "/tools", "/connectivity", "/tourism-pulse", "/aeronautical-publications",
  "/observatory", "/industry-atlas", "/places", "/tax-services", "/tax-services/archive",
  "/trade-flow", "/ajman-business", "/ajman-urban", "/ajman-parks", "/health-indicators",
  "/health-facilities", "/health-facilities-map", "/education", "/employment-gender",
  "/golden-residency", "/business-setup", "/startup-support", "/founder-pathway",
  "/national-brief", "/evidence-studio", "/policy-watch",
] as const;

describe("public visual system", () => {
  it("adds the shared responsive and accessible brand layer once", () => {
    const original = '<!doctype html><html><head><title>Demo — OEI</title></head><body><h1>Large title</h1></body></html>';
    const styled = applyPublicVisualSystem(original);

    expect(styled).toContain("data-oei-visual-system");
    expect(styled).toContain('data-design-system="oei-product-v1"');
    expect(styled).toContain("--oei-type-body:1rem");
    expect(styled).toContain("--oei-space-05:1rem");
    expect(styled).toContain("--oei-control-lg:3rem");
    expect(styled).toContain("--oei-content-max:100rem");
    expect(styled).toContain('font-family:"Dubai",Arial,sans-serif!important');
    expect(styled).toContain("prefers-reduced-motion:reduce");
    expect(styled).toContain("focus-visible");
    expect(styled).not.toContain("—");
    expect(applyPublicVisualSystem(styled)).toBe(styled);
  });

  it("fails closed when a renderer does not return a complete document", () => {
    expect(() => applyPublicVisualSystem("<main>fragment</main>")).toThrow("complete HTML document");
  });

  it("applies one design-system contract to every public interface", async () => {
    for (const route of publicRoutes) {
      const response = await handleRest(new Request(`http://localhost${route}`));
      expect(response?.status).toBe(200);
      expect(await response?.text()).toContain('data-design-system="oei-product-v1"');
    }
  });
});
