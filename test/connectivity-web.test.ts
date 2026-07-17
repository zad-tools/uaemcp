import { describe, expect, it } from "bun:test";
import { connectivityPage } from "../src/connectivity-web.js";
import { handleRest } from "../src/rest.js";

describe("UAE Connectivity Pulse interface", () => {
  it("ships a bilingual, source-cited TDRA evidence interface", () => {
    const page = connectivityPage();
    expect(page).toContain("UAE Connectivity Pulse");
    expect(page).toContain("نبض الاتصالات في الإمارات");
    expect(page).toContain("SUBSCRIPTIONS ≠ PEOPLE");
    expect(page).toContain("الاشتراكات ≠ الأشخاص");
    expect(page).toContain("/api/v1/connectivity");
    expect(page).toContain("https://tdra.gov.ae/en/open-data/data-sets");
    expect(page).toContain("/assets/fonts/Dubai-Regular.woff");
    expect(page).toContain("/assets/fonts/Dubai-Bold.woff");
    expect(page).toContain("document.documentElement.dir=state.lang==='ar'?'rtl':'ltr'");
    expect(page).toContain("role=\"img\"");
    expect(() => new Function(page.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "")).not.toThrow();
  });

  it("serves the interface under the shared security policy", async () => {
    const response = await handleRest(new Request("http://localhost/connectivity"));
    expect(response?.status).toBe(200);
    expect(response?.headers.get("content-type")).toContain("text/html");
    expect(response?.headers.get("content-security-policy")).toContain("font-src 'self'");
  });
});
