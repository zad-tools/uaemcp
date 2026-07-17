import { describe, expect, it } from "bun:test";
import { startupSupportPage } from "../src/startup-support-web.js";
import { singleInlineScript } from "./support/html.js";

describe("Startup Support interface", () => {
  it("ships bilingual Dubai Font programme discovery with valid browser code", () => {
    const html = startupSupportPage();
    expect(html).toContain('font-family:"Dubai"');
    expect(html).toContain("دليل دعم الشركات الناشئة");
    expect(html).toContain("/api/v1/startup-support/match");
    expect(html).toContain('id="lang"');
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
