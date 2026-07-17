import { describe, expect, it } from "bun:test";
import { educationLedgerPage } from "../src/education-ledger-web.js";
import { singleInlineScript } from "./support/html.js";

describe("Education Ledger interface", () => {
  it("ships bilingual Dubai Font evidence and a valid browser script", () => {
    const html = educationLedgerPage();
    expect(html).toContain("Dubai-Regular.woff");
    expect(html).toContain("UAE Education Ledger");
    expect(html).toContain("سجل التعليم في الإمارات");
    expect(html).toContain("/api/v1/education");
    expect(html).toContain("VERIFIED SNAPSHOT");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
