import { describe, expect, it } from "bun:test";
import { healthFacilitiesMapPage } from "../src/health-facilities-map-web.js";
import { listProducts } from "../src/products.js";
import { singleInlineScript } from "./support/html.js";

describe("MOHAP Health Facilities Map interface", () => {
  it("ships searchable bilingual coordinate evidence with explicit boundaries", () => {
    const html = healthFacilitiesMapPage();
    expect(html).toContain("UAE Health Facilities Map");
    expect(html).toContain("خريطة المنشآت الصحية في الإمارات");
    expect(html).toContain("NAME + COORDINATE ONLY");
    expect(html).toContain("الاسم + الإحداثيات فقط");
    expect(html).toContain("15,326");
    expect(html).toContain("7,471");
    expect(html).toContain("7,855");
    expect(html).toContain("/api/v1/health-facilities-map");
    expect(html).toContain("https://mohap.gov.ae/en/open-data/mohap-open-data");
    expect(html).toContain('role="img"');
    expect(html).toContain('url("/assets/fonts/Dubai-Regular.woff")');
    expect(html).toContain('url("/assets/fonts/Dubai-Bold.woff")');
    expect(html).toContain("document.documentElement.dir=state.lang==='ar'?'rtl':'ltr'");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });

  it("publishes a distinct product contract without replacing the aggregate atlas", () => {
    const products = listProducts();
    expect(products.find(({ id }) => id === "health_facilities_map")).toMatchObject({
      webPath: "/health-facilities-map",
      apiPath: "/api/v1/health-facilities-map",
      sourceIds: ["mohap_health_facilities_gis_2026"],
    });
    expect(products.find(({ id }) => id === "health_facilities_atlas")?.webPath).toBe("/health-facilities");
  });

  it("renders a bounded GeoJSON feature as a named coordinate point", async () => {
    const elements = new Map<string, any>();
    const element = (id: string) => {
      const value = { id, dataset: { en: "SEARCH OFFICIAL NAMES", ar: "ابحث" }, value: "", textContent: "", innerHTML: "", disabled: false, setAttribute() {}, addEventListener() {} };
      elements.set(`#${id}`, value);
      return value;
    };
    for (const id of ["grid", "points", "mapped", "count", "list", "delivery", "fetched", "submit", "query", "search", "lang"]) (globalThis as any)[id] = element(id);
    const previousDocument = globalThis.document;
    const previousFetch = globalThis.fetch;
    (globalThis as any).document = {
      documentElement: { lang: "en", dir: "ltr" },
      querySelector: (selector: string) => elements.get(selector),
      querySelectorAll: () => [],
    };
    globalThis.fetch = (async () => Response.json({
      ok: true,
      data: { type: "FeatureCollection", features: [{ id: 1, nameEn: "Al Noor Clinic", nameAr: "عيادة النور", longitude: 55.27, latitude: 25.2 }] },
      error: null,
      meta: { delivery: "live", fetched_at: "2026-07-18T00:00:00Z" },
    })) as unknown as typeof fetch;
    try {
      new Function(singleInlineScript(healthFacilitiesMapPage()))();
      await Bun.sleep(0);
      expect(elements.get("#list").innerHTML).toContain("Al Noor Clinic");
      expect(elements.get("#list").innerHTML).toContain("25.200000° N / 55.270000° E");
      expect(elements.get("#points").innerHTML).toContain('<circle class="point"');
      expect(elements.get("#mapped").textContent).toBe("1 MAPPED RESULTS");
    } finally {
      globalThis.fetch = previousFetch;
      (globalThis as any).document = previousDocument;
      for (const id of ["grid", "points", "mapped", "count", "list", "delivery", "fetched", "submit", "query", "search", "lang"]) delete (globalThis as any)[id];
    }
  });
});
