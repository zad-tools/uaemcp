import { describe, expect, it } from "bun:test";
import { trustSummary } from "../src/manifest.js";
import { landingPage } from "../src/web.js";
import { singleInlineScript } from "./support/html.js";

describe("bilingual landing page", () => {
  it("translates navigation, proof, workflow, catalog and interactive controls", () => {
    const html = landingPage();
    for (const arabic of [
      "المنتجات", "رادار التجارة", "مصادر رسمية", "بوابات رسمية", "الموصلات",
      "بوابة رسمية", "طبقة دلالية", "سجل المصادر", "اكتشف البيانات", "نفّذ الطلب",
      "ساهم عبر GITHUB", "تصميم وصيانة أحمد مرسي",
    ]) expect(html).toContain(arabic);
    expect(html).toContain('data-placeholder-ar="ابحث عن مصدر أو جهة أو إمارة…"');
    expect(html).toContain('data-aria-ar="خريطة بيانات الإمارات المتحركة"');
    expect(html).toContain('data-aria-ar="Switch to English"');
    expect(html).toContain('label for="datasetSource"');
    expect(html).toContain("Promise.allSettled([productsTask,catalogTask])");
    expect(html).toContain("state.productError");
    expect(html).toContain("renderDatasetView();renderOutputView()");
    expect(html).toContain("const rows=await loadJson('/api/v1/sources/'");
  });

  it("keeps the generated browser script syntactically valid", () => {
    expect(() => new Function(singleInlineScript(landingPage()))).not.toThrow();
  });

  it("renders the current trust contract instead of stale brand metrics", () => {
    const html = landingPage();
    const summary = trustSummary();

    expect(html).toContain(`VERSION ${summary.version}`);
    expect(html).toContain(`id="toolCount">${summary.totalTools}</strong>`);
    expect(html).toContain(`${summary.readTools} READ / ${summary.writeTools} GUARDED WRITE`);
    expect(html).not.toContain("VERSION 1.61</span>");
  });
});
