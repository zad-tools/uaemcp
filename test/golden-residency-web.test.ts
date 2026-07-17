import { describe, expect, it } from "bun:test";
import { goldenResidencyPage } from "../src/golden-residency-web.js";

describe("Golden Residency interface", () => {
  it("ships bilingual Dubai Font readiness guidance and a valid browser script", () => {
    const html = goldenResidencyPage();
    expect(html).toContain("Dubai-Regular.woff");
    expect(html).toContain("UAE Golden Residency Navigator");
    expect(html).toContain("الإقامة الذهبية");
    expect(html).toContain("/api/v1/golden-residency/assess");
    expect(html).toContain("not an eligibility decision");
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
    expect(scripts).toHaveLength(2);
    for (const script of scripts) expect(() => new Function(script)).not.toThrow();
  });
});
