import { describe, expect, it } from "bun:test";
import { buildEvidenceDossier, type EvidenceDossierInput } from "../src/evidence-dossier.js";

const input = (): EvidenceDossierInput => ({
  question: "What official evidence describes health provision in the UAE?",
  language: "en",
  template: "research_dossier",
  pillars: [
    {
      id: "health_facilities",
      title: { en: "Published facility counts", ar: "أعداد المنشآت المنشورة" },
      fact: { en: "Aggregate counts by emirate and sector.", ar: "أعداد مجمعة حسب الإمارة والقطاع." },
      period: "2024",
      unit: { en: "published aggregate facility count", ar: "عدد منشآت مجمع منشور" },
      scope: { en: "All seven emirates", ar: "الإمارات السبع" },
      sourceIds: ["mohap_health_facilities_2024"],
      citation: "https://mohap.gov.ae/open-data",
      fetchedAt: "2026-07-17T00:00:00Z",
      delivery: "live",
      limitations: [{ en: "Rows are aggregates, not individual facilities.", ar: "الصفوف مجمعة وليست منشآت فردية." }],
    },
    {
      id: "industry",
      title: { en: "Industry evidence", ar: "أدلة الصناعة" },
      fact: { en: "Unavailable for this request.", ar: "غير متاحة لهذا الطلب." },
      period: null,
      unit: null,
      scope: { en: "No compatible current series", ar: "لا توجد سلسلة حالية متوافقة" },
      sourceIds: ["moiat_industrial_licenses"],
      citation: "https://mohap.gov.ae/open-data",
      fetchedAt: null,
      delivery: "unavailable",
      limitations: [{ en: "Unavailable evidence is not zero.", ar: "الدليل غير المتاح لا يساوي صفرًا." }],
    },
  ],
  methodology: [{ en: "Keep every source in its native period and unit.", ar: "احتفظ بكل مصدر بفترته ووحدته الأصلية." }],
  limitations: [{ en: "Do not infer access or quality from facility counts.", ar: "لا تستنتج الوصول أو الجودة من أعداد المنشآت." }],
});

describe("UAE Evidence Studio dossier domain", () => {
  it("builds deterministic, source-separated evidence and explicit unavailable cards", () => {
    const first = buildEvidenceDossier(input());
    const second = buildEvidenceDossier(input());

    expect(first).toEqual(second);
    expect(first.kind).toBe("uae_evidence_dossier");
    expect(first.scope).toEqual({ pillarsRequested: 2, pillarsAvailable: 1, pillarsUnavailable: 1 });
    expect(first.pillars[1]).toMatchObject({ id: "industry", delivery: "unavailable" });
    expect(first.evidence.map(({ id }) => id)).toEqual(["health_facilities"]);
    expect(first.unavailable[0]).toMatchObject({ id: "industry", reason: { en: "Unavailable for this request." } });
    expect(first.generatedAt).toBe("2026-07-17T00:00:00Z");
    expect(first.citations).toEqual(["https://mohap.gov.ae/open-data"]);
  });

  it("makes the result deeply immutable without mutating caller input", () => {
    const source = input();
    const result = buildEvidenceDossier(source);

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.pillars)).toBe(true);
    expect(Object.isFrozen(result.pillars[0]?.fact)).toBe(true);
    expect(() => ((result.pillars[0]!.fact as { en: string }).en = "changed")).toThrow();
    expect(source.pillars[0]!.fact.en).toContain("Aggregate");
  });

  it("keeps methodology honest and forbids ranking or composite calculation", () => {
    const result = buildEvidenceDossier(input());

    expect(result.methodology).toMatchObject({
      operation: "side_by_side_source_native_evidence",
      crossEvidenceAggregation: false,
      compositeScore: false,
      ranking: false,
    });
    expect(result.limitations.map(({ en }) => en).join(" ")).toContain("must not be added, ranked");
    expect(() => buildEvidenceDossier({ ...input(), compositeScore: true } as EvidenceDossierInput)).toThrow("composite or ranking");
    expect(() => buildEvidenceDossier({ ...input(), ranking: true } as EvidenceDossierInput)).toThrow("composite or ranking");
  });

  it("validates the question, language, template, unique card ids and card boundaries", () => {
    expect(() => buildEvidenceDossier({ ...input(), question: " " })).toThrow("question");
    expect(() => buildEvidenceDossier({ ...input(), question: "x".repeat(201) })).toThrow("question");
    expect(() => buildEvidenceDossier({ ...input(), language: "fr" } as unknown as EvidenceDossierInput)).toThrow("language");
    expect(() => buildEvidenceDossier({ ...input(), template: "ranking" } as unknown as EvidenceDossierInput)).toThrow("template");
    const duplicate = input();
    expect(() => buildEvidenceDossier({ ...duplicate, pillars: [duplicate.pillars[0]!, duplicate.pillars[0]!] })).toThrow("unique");
  });
});
