import { describe, expect, it } from "bun:test";
import { placesExplorerPage } from "../src/places-web.js";

describe("Place Names Explorer web", () => {
  it("uses local Dubai Font and the normalized product endpoint", () => {
    const html = placesExplorerPage();
    expect(html).toContain("/assets/fonts/Dubai-Regular.woff");
    expect(html).toContain("/assets/fonts/Dubai-Bold.woff");
    expect(html).toContain("/api/v1/places");
    expect(html).not.toContain("dubaihumanitarian.ae");
  });

  it("localizes runtime states and supports mobile RTL without horizontal positioning", () => {
    const html = placesExplorerPage();
    expect(html).toContain("جارٍ البحث");
    expect(html).toContain("المصدر غير متاح");
    expect(html).toContain("نتيجة على الخريطة");
    expect(html).toContain("document.documentElement.dir");
    expect(html).toContain("@media(max-width:560px)");
    expect(html).toContain("border-inline-start");
  });
});
