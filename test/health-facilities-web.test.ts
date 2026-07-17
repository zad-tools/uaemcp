import { describe, expect, it } from "bun:test";
import { healthFacilitiesPage } from "../src/health-facilities-web.js";
import { singleInlineScript } from "./support/html.js";

describe("Health Facilities Atlas interface", () => {
  it("ships bilingual aggregate evidence in Dubai Font with valid browser code", () => {
    const html = healthFacilitiesPage();
    expect(html).toContain('html body *{font-family:"Dubai",Arial,sans-serif!important}');
    expect(html).toContain("أطلس المنشآت الصحية في الإمارات");
    expect(html).toContain("Aggregate counts ≠ facility directory");
    expect(html).toContain('data-ar="الصفوف المجمعة"');
    expect(html).toContain('data-ar="تطبيق النطاق"');
    expect(html).toContain("allEmirates:'كل الإمارات'");
    expect(html).toContain("officialSource:'المصدر الرسمي'");
    expect(html).toContain("sourceRows:'صفوف مصدرية'");
    expect(html).toContain("year.setAttribute('aria-label',isAr?ar.year:'Year')");
    expect(html).toContain("document.title=isAr?ar.title:'UAE Health Facilities Atlas'");
    expect(html).toContain("limitationsAr");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
