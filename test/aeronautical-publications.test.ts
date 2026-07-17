import { describe, expect, it } from "bun:test";
import { buildAeronauticalPublicationReport, parseAeronauticalPublications } from "../src/aeronautical-publications.js";

const html = `<html><body><table><tr><th>Package date</th></tr><tr><td><a>16 JUL 2026</a></td><td>23 JUL 2026<br>23 JUL 2026</td><td>23 JUL 2026<br>03 SEP 2026</td><td>SUP 24/2026<br>SUP 26/2026</td></tr><tr><td>25 JUN 2026</td><td>25 JUN 2026</td><td>06 AUG 2026</td><td>AIRAC AMDT 08/2026</td></tr></table></body></html>`;

describe("GCAA aeronautical publications", () => {
  it("pairs source-native dates and descriptions without interpretation", () => {
    expect(parseAeronauticalPublications(html)).toEqual([
      { packageDate: "16 JUL 2026", publicationDate: "23 JUL 2026", effectiveDate: "23 JUL 2026", description: "SUP 24/2026", kind: "supplement" },
      { packageDate: "16 JUL 2026", publicationDate: "23 JUL 2026", effectiveDate: "03 SEP 2026", description: "SUP 26/2026", kind: "supplement" },
      { packageDate: "25 JUN 2026", publicationDate: "25 JUN 2026", effectiveDate: "06 AUG 2026", description: "AIRAC AMDT 08/2026", kind: "airac_amendment" },
    ]);
  });

  it("filters one publication kind and preserves evidence boundaries", () => {
    const report = buildAeronauticalPublicationReport(parseAeronauticalPublications(html), { kind: "airac_amendment", limit: 5, fetchedAt: "2026-07-18T00:00:00Z", citation: "https://gcaa.gov.ae/aip" });
    expect(report.publications).toHaveLength(1);
    expect(report.methodology.interpretation).toBe(false);
    expect(report.limitations.join(" ")).toContain("not aeronautical operational guidance");
  });

  it("fails closed on missing rows and unsafe limits", () => {
    expect(() => parseAeronauticalPublications("<html></html>")).toThrow("invalid GCAA");
    expect(() => buildAeronauticalPublicationReport(parseAeronauticalPublications(html), { limit: 51, fetchedAt: "x", citation: "x" })).toThrow("limit");
    expect(() => buildAeronauticalPublicationReport(parseAeronauticalPublications(html), { kind: "not-a-kind" as any, fetchedAt: "x", citation: "x" })).toThrow("kind");
  });

  it("bounds untrusted upstream HTML and decoded publication cells", () => {
    expect(() => parseAeronauticalPublications(`<html>${"x".repeat(2_000_001)}</html>`)).toThrow("too large");
    const longCell = `<html><body><table><tr><td>16 JUL 2026</td><td>23 JUL 2026</td><td>03 SEP 2026</td><td>${"A".repeat(2001)}</td></tr></table></body></html>`;
    expect(() => parseAeronauticalPublications(longCell)).toThrow("cell exceeds");
    const tooMany = `<html><body><table>${Array.from({ length: 501 }, (_, index) => `<tr><td>16 JUL 2026</td><td>23 JUL 2026</td><td>03 SEP 2026</td><td>SUP ${index}/2026</td></tr>`).join("")}</table></body></html>`;
    expect(() => parseAeronauticalPublications(tooMany)).toThrow("too many publication rows");
  });
});
