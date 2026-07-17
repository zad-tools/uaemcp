import { describe, expect, it } from "bun:test";
import { startupSupportPage } from "../src/startup-support-web.js";

describe("Startup Support interface", () => {
  it("ships bilingual Dubai Font programme discovery with valid browser code", () => {
    const html = startupSupportPage();
    expect(html).toContain('font-family:"Dubai"');
    expect(html).toContain("دليل دعم الشركات الناشئة");
    expect(html).toContain("/api/v1/startup-support/match");
    expect(html).toContain('id="lang"');
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
    expect(() => new Function(script ?? "")).not.toThrow();
  });
});
