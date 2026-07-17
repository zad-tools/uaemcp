import { describe, expect, it } from "bun:test";
import { goldenResidencyPage } from "../src/golden-residency-web.js";
import { inlineScripts } from "./support/html.js";

describe("Golden Residency interface", () => {
  it("ships bilingual Dubai Font readiness guidance and a valid browser script", () => {
    const html = goldenResidencyPage();
    expect(html).toContain("Dubai-Regular.woff");
    expect(html).toContain("UAE Golden Residency Navigator");
    expect(html).toContain("الإقامة الذهبية");
    expect(html).toContain("/api/v1/golden-residency/assess");
    expect(html).toContain("not an eligibility decision");
    expect(html).toContain("jurisdictionSelect.id='jurisdiction'");
    expect(html).toContain("WHERE WILL YOU APPLY?");
    expect(html).toContain("LOCAL CRITERIA CHECK");
    expect(html).toContain("MutationObserver");
    const scripts = inlineScripts(html);
    expect(scripts).toHaveLength(3);
    for (const script of scripts) expect(() => new Function(script)).not.toThrow();
  });
});
