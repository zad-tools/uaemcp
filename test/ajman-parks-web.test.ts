import { describe, expect, it } from "bun:test";
import { ajmanParksPage } from "../src/ajman-parks-web.js";

describe("Ajman Parks Footfall interface", () => {
  it("ships bilingual Dubai Font evidence with an explicit unique-people boundary", () => {
    const page = ajmanParksPage();
    expect(page).toContain("Ajman Parks Footfall");
    expect(page).toContain("زيارات حدائق عجمان");
    expect(page).toContain("VISITS ≠ UNIQUE PEOPLE");
    expect(page).toContain("/assets/fonts/Dubai-Regular.woff");
    expect(page).toContain("document.documentElement.dir=state.lang==='ar'?'rtl':'ltr'");
    expect(page).toContain("/api/v1/ajman-parks");
    expect(() => new Function(page.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "")).not.toThrow();
  });
});
