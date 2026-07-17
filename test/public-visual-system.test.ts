import { describe, expect, it } from "bun:test";
import { applyPublicVisualSystem } from "../src/public-visual-system.js";

describe("public visual system", () => {
  it("adds the shared responsive and accessible brand layer once", () => {
    const original = '<!doctype html><html><head><title>Demo — OEI</title></head><body><h1>Large title</h1></body></html>';
    const styled = applyPublicVisualSystem(original);

    expect(styled).toContain("data-oei-visual-system");
    expect(styled).toContain('font-family:"Dubai",Arial,sans-serif!important');
    expect(styled).toContain("prefers-reduced-motion:reduce");
    expect(styled).toContain("focus-visible");
    expect(styled).not.toContain("—");
    expect(applyPublicVisualSystem(styled)).toBe(styled);
  });

  it("fails closed when a renderer does not return a complete document", () => {
    expect(() => applyPublicVisualSystem("<main>fragment</main>")).toThrow("complete HTML document");
  });
});
