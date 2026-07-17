import { describe, expect, it } from "bun:test";
import { evidenceStudioPage } from "../src/evidence-studio-web.js";
import { singleInlineScript } from "./support/html.js";

describe("UAE Evidence Studio interface", () => {
  it("ships a bilingual, stateless evidence composer in Dubai Font", () => {
    const html = evidenceStudioPage();
    expect(html).toContain('html body *{font-family:"Dubai",Arial,sans-serif!important}');
    expect(html).toContain("استوديو الأدلة الإماراتية");
    expect(html).toContain('data-ar="اختر من محورين إلى خمسة"');
    expect(html).toContain("NO ACCOUNT · NO PII · NOTHING STORED");
    expect(html).toContain("لا حساب · لا بيانات شخصية · لا تخزين");
    expect(html).toContain('maxlength="200"');
    expect(html).toContain('role="status" aria-live="polite" tabindex="-1"');
    expect(html).not.toContain("localStorage");
    expect(html).not.toContain("sessionStorage");
  });

  it("posts the approved contract and renders every evidence boundary", () => {
    const html = evidenceStudioPage();
    expect(html).toContain("fetch('/api/v1/evidence-dossier'");
    expect(html).toContain('value="evidence_brief"');
    expect(html).toContain('value="research_dossier"');
    expect(html).toContain('value="source_comparison"');
    expect(html).not.toContain('value="national_context"');
    expect(html).toContain("{template:template.value,question:q,language:state.lang,pillars}");
    expect(html).toContain("pillars.length<2||pillars.length>5");
    expect(html).toContain("x.period");
    expect(html).toContain("x.unit");
    expect(html).toContain("x.delivery");
    expect(html).toContain("x.scope");
    expect(html).toContain("x.citation");
    expect(html).toContain("item.limitations");
    expect(html).toContain("limits.map(t).filter(Boolean).join(' · ')");
    expect(html).toContain("templateLabel(d.template??template.value)");
    expect(html).toContain("deliveryLabel(x.delivery??'unknown')");
    expect(html).toContain("d.question??question.value");
    expect(html).toContain("output.focus({preventScroll:true})");
    expect(html).toContain("d.unavailable");
  });

  it("offers local print, Markdown and JSON exports with valid browser code", () => {
    const html = evidenceStudioPage();
    expect(html).toContain("uae-evidence-dossier.md");
    expect(html).toContain("uae-evidence-dossier.json");
    expect(html).toContain("printDossier.addEventListener('click',()=>print())");
    expect(html).toContain("@media print");
    expect(() => new Function(singleInlineScript(html))).not.toThrow();
  });
});
