import { describe, expect, it } from "bun:test";
import { healthIndicatorsPage } from "../src/health-indicators-web.js";

describe("Health Indicators interface", () => {
  it("ships bilingual evidence, search and a valid browser script", () => {
    const html = healthIndicatorsPage();
    expect(html).toContain("UAE Health Indicators");
    expect(html).toContain("مؤشرات الصحة<br>في الإمارات");
    expect(html).toContain('font-family:"Dubai"');
    expect(html).toContain("Read values carefully.");
    expect(html).toContain("اقرأ القيم بحذر.");
    expect(html).toContain("/api/v1/health-indicators?limit=200");
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
    expect(script).toBeDefined();
    expect(() => new Function(script ?? "")).not.toThrow();
  });
});
