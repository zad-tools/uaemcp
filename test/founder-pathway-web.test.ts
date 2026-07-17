import { describe, expect, it } from "bun:test";
import { founderPathwayPage } from "../src/founder-pathway-web.js";

describe("Founder Pathway web product", () => {
  it("ships a bilingual Dubai Font journey over the same REST contract", () => {
    const html = founderPathwayPage();
    expect(html).toContain("/api/v1/founder-pathway");
    expect(html).toContain("Dubai-Regular.woff");
    expect(html).toContain("مسار المؤسس");
    expect(html).toContain("dir=\"ltr\"");
  });
});
