import { describe, expect, it } from "bun:test";
import { landingPage } from "../src/web.js";

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
    const script = landingPage().match(/<script>([\s\S]*)<\/script>/)?.[1];
    expect(script).toBeDefined();
    expect(() => new Function(script ?? "")).not.toThrow();
  });
});
