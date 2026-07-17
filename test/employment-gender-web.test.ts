import { describe, expect, it } from "bun:test";
import { employmentGenderPage } from "../src/employment-gender-web.js";
import { singleInlineScript } from "./support/html.js";

describe("MOHRE employment by gender interface", () => {
  it("ships a bilingual, mobile-safe ledger with valid browser code", () => {
    const html = employmentGenderPage();
    expect(html).toContain("Employment by gender.");
    expect(html).toContain("العمالة حسب النوع.");
    expect(html).toContain("@media(max-width:540px)");
    expect(html).toContain("Dubai-Regular.woff");
    expect(html).toContain("Dubai-Bold.woff");
    expect(html).toContain("85.81271671570649");
    expect(html).toContain("14.187283284293503");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });

  it("states the source and interpretation boundaries without a composite claim", () => {
    const html = employmentGenderPage();
    expect(html).toContain("Registered private sector only.");
    expect(html).toContain("Percentage share");
    expect(html).toContain("Employee counts");
    expect(html).toContain("does not measure pay gap, workplace equality, job quality, or causes");
    expect(html).toContain("used only to validate each published year, never as a composite metric");
  });

  it("provides accessible structure, keyboard focus, and reduced-motion support", () => {
    const html = employmentGenderPage();
    expect(html).toContain('href="#main"');
    expect(html).toContain('<main id="main">');
    expect(html).toContain('<table>');
    expect(html).toContain("<caption");
    expect(html).toContain('role="status" aria-live="polite"');
    expect(html).toContain('aria-labelledby="ledger-title"');
    expect(html).toContain("focus-visible");
    expect(html).toContain("prefers-reduced-motion:reduce");
    expect(html).not.toContain('user-scalable=no');
  });
});
