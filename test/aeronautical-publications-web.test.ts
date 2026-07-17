import { expect, it } from "bun:test";
import { aeronauticalPublicationsPage } from "../src/aeronautical-publications-web.js";

it("ships a bilingual Dubai Font GCAA evidence interface with operational boundaries", () => {
  const html = aeronauticalPublicationsPage();
  expect(html).toContain('font-family:"Dubai"');
  expect(html).toContain("منشورات الطيران في الإمارات");
  expect(html).toContain("INDEX ≠ NOTAM");
  expect(html).toContain("CURRENT INDEX RECORDS");
  expect(html).toContain("سجلات الفهرس الحالي");
  expect(html).toContain("AIRAC AMENDMENTS");
  expect(html).toContain("OFFICIAL GCAA eAIP ↗");
  expect(html).toContain('aria-label="Filter aeronautical publications"');
  expect(html).toContain('id="empty"');
  expect(html).toContain("function render");
  expect(html).toContain("/api/v1/aeronautical-publications");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (script === undefined) throw new Error("page script missing");
  expect(() => new Function(script)).not.toThrow();
});

it("documents the product with an accessible animated evidence visual", async () => {
  const readme = await Bun.file(new URL("../README.md", import.meta.url)).text();
  const visual = await Bun.file(new URL("../docs/assets/aeronautical-publications-motion.svg", import.meta.url)).text();
  expect(readme).toContain("docs/assets/aeronautical-publications-motion.svg");
  expect(readme).toContain("UAE Aeronautical Publications");
  expect(readme).toContain("discovery index—not NOTAM");
  expect(visual).toContain('<title id="title">UAE Aeronautical Publications</title>');
  expect(visual).toContain("prefers-reduced-motion:reduce");
  expect(visual).toContain("INDEX ≠ NOTAM");
});
