import { describe, expect, it } from "bun:test";
import { ajmanUrbanPage } from "../src/ajman-urban-web.js";
import { singleInlineScript } from "./support/html.js";

describe("Ajman Urban Evidence interface", () => {
  it("ships a bilingual Dubai Font explorer with a valid browser script", () => {
    const html = ajmanUrbanPage();
    expect(html).toContain("Dubai-Regular.woff");
    expect(html).toContain("Ajman Urban Evidence");
    expect(html).toContain("أدلة التطور الحضري في عجمان");
    expect(html).toContain("/api/v1/ajman-urban");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
