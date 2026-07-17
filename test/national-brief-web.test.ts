import { describe, expect, it } from "bun:test";
import { nationalBriefPage } from "../src/national-brief-web.js";
import { singleInlineScript } from "./support/html.js";

describe("National Evidence Brief interface", () => {
  it("ships a bilingual Dubai Font interface with valid browser code", () => {
    const html = nationalBriefPage();
    expect(html).toContain('font-family:"Dubai"');
    expect(html).toContain('html body *{font-family:"Dubai",Arial,sans-serif!important}');
    expect(html).toContain("موجز الأدلة الوطني للإمارات");
    expect(html).toContain('<option value="abu_dhabi">Abu Dhabi</option>');
    expect(html).toContain('<option value="ras_al_khaimah">Ras Al Khaimah</option>');
    expect(html).not.toContain("<option>Abu Dhabi</option>");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
