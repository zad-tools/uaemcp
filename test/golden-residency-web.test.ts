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
    expect(() => new Function(html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "")).not.toThrow();
  });
});
