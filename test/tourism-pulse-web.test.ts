import { describe, expect, it } from "bun:test";
import { tourismPulsePage } from "../src/tourism-pulse-web.js";
import { singleInlineScript } from "./support/html.js";

describe("UAE Tourism Pulse interface", () => {
  it("ships a bilingual Dubai Font explorer with explicit evidence boundaries", () => {
    const html = tourismPulsePage();
    expect(html).toContain("UAE Tourism Pulse");
    expect(html).toContain("نبض السياحة في الإمارات");
    expect(html).toContain("GUESTS ≠ UNIQUE TOURISTS");
    expect(html).toContain("النزلاء ≠ سياح فريدون");
    expect(html).toContain("DESCRIPTIVE TREND ≠ CAUSALITY");
    expect(html).toContain("National annual aggregates");
    expect(html).toContain("SOURCE FRACTION × 100");
    expect(html).toContain("/api/v1/tourism-pulse");
    expect(html).toContain("/assets/fonts/Dubai-Regular.woff");
    expect(html).toContain("/assets/fonts/Dubai-Bold.woff");
    expect(html).toContain('id="metricFilters"');
    expect(html).toContain('id="yearFrom"');
    expect(html).toContain('id="yearTo"');
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });

  it("documents the product with an accessible animated evidence visual", async () => {
    const readme = await Bun.file(new URL("../README.md", import.meta.url)).text();
    const visual = await Bun.file(new URL("../docs/assets/tourism-pulse-motion.svg", import.meta.url)).text();
    expect(readme).toContain("docs/assets/tourism-pulse-motion.svg");
    expect(readme).toContain("UAE Tourism Pulse");
    expect(readme).toContain("national annual aggregates");
    expect(visual).toContain('<title id="title">UAE Tourism Pulse</title>');
    expect(visual).toContain("prefers-reduced-motion:reduce");
    expect(visual).toContain("GUESTS ≠ UNIQUE TOURISTS");
  });
});
