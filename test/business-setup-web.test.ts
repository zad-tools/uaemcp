import { describe, expect, it } from "bun:test";
import { businessSetupPage } from "../src/business-setup-web.js";
import { singleInlineScript } from "./support/html.js";

describe("Business Setup interface", () => {
  it("ships bilingual Dubai Font routing with a valid browser script", () => {
    const html = businessSetupPage();
    expect(html).toContain('font-family:"Dubai"');
    expect(html).toContain("دليل تأسيس الأعمال");
    expect(html).toContain("/api/v1/business-setup/route");
    expect(html).toContain('id="lang"');
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
