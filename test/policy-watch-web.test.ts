import { describe, expect, it } from "bun:test";
import { policyWatchPage } from "../src/policy-watch-web.js";
import { singleInlineScript } from "./support/html.js";

describe("UAE Policy Evidence Watch interface", () => {
  it("ships a bilingual, same-origin Dubai Font evidence surface", () => {
    const html = policyWatchPage();
    expect(html).toContain('html,body,body *{font-family:"Dubai",Arial,sans-serif!important}');
    expect(html).toContain('url("/assets/fonts/Dubai-Regular.woff")');
    expect(html).toContain("مرصد أدلة السياسات في الإمارات");
    expect(html).toContain('data-ar="سجل التغييرات"');
    expect(html).toContain("NO TRACKING · NO ACCOUNT · NO USER DATA");
    expect(html).not.toContain("localStorage");
    expect(html).not.toContain("sessionStorage");
  });

  it("loads the watch and submits only selected source ids", () => {
    const html = policyWatchPage();
    expect(html).toContain("fetch('/api/v1/policy-watch')");
    expect(html).toContain("fetch('/api/v1/policy-watch/check'");
    expect(html).toContain("JSON.stringify({sourceIds:selectedSources()})");
    expect(html).toContain("snapshotStatus");
    expect(html).toContain("previousSnapshotAt");
    expect(html).toContain("beforeHash");
    expect(html).toContain("afterHash");
    expect(html).toContain("limitations");
  });

  it("supports RTL, responsive layouts and accessible async status", () => {
    const html = policyWatchPage();
    expect(html).toContain("document.documentElement.dir=state.lang==='ar'?'rtl':'ltr'");
    expect(html).toContain('id="status" role="status" aria-live="polite"');
    expect(html).toContain('id="changes" aria-live="polite"');
    expect(html).toContain("@media(max-width:760px)");
    expect(html).toContain("@media(prefers-reduced-motion:reduce)");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
