import { describe, expect, it } from "bun:test";
import { healthIndicatorsPage } from "../src/health-indicators-web.js";
import { singleInlineScript } from "./support/html.js";

describe("Health Indicators interface", () => {
  it("ships bilingual evidence, search and a valid browser script", () => {
    const html = healthIndicatorsPage();
    expect(html).toContain("UAE Health Indicators");
    expect(html).toContain("مؤشرات الصحة<br>في الإمارات");
    expect(html).toContain('font-family:"Dubai"');
    expect(html).toContain("المصدر المباشر غير متاح لهذا الطلب");
    expect(html).toContain("البحث في المؤشرات");
    expect(html).toContain("Read values carefully.");
    expect(html).toContain("اقرأ القيم بحذر.");
    expect(html).toContain("/api/v1/health-indicators?limit=200");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
