import { describe, expect, it } from "bun:test";
import { ajmanBusinessPage } from "../src/ajman-business-web.js";
import { singleInlineScript } from "./support/html.js";

describe("Ajman Business Evidence interface", () => {
  it("ships a bilingual Dubai Font evidence explorer with valid browser code", () => {
    const html = ajmanBusinessPage();
    expect(html).toContain("Dubai-Regular.woff");
    expect(html).toContain("Ajman Business Evidence");
    expect(html).toContain("أدلة الأعمال في عجمان");
    expect(html).toContain("/api/v1/ajman-business");
    expect(html).toContain("not unique companies");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
