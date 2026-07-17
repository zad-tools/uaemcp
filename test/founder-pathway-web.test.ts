import { describe, expect, it } from "bun:test";
import { founderPathwayPage } from "../src/founder-pathway-web.js";
import { singleInlineScript } from "./support/html.js";

describe("Founder Pathway web product", () => {
  it("ships a bilingual Dubai Font journey over the same REST contract", () => {
    const html = founderPathwayPage();
    expect(html).toContain("/api/v1/founder-pathway");
    expect(html).toContain("Dubai-Regular.woff");
    expect(html).toContain("ملف تنفيذ المؤسس");
    expect(html).toContain("dir=\"ltr\"");
    expect(html).toContain("downloadDossier");
    expect(html).toContain("printDossier");
    expect(html).toContain("action-progress");
    expect(html).toContain("session only");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
