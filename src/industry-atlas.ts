import { emirateFromRecord } from "./geography.js";
import { normalizeText } from "./glossary.js";

type RecordValue = Record<string, unknown>;

export interface IndustryAtlasEvidence {
  sourceId: string;
  citation: string;
  fetchedAt: string;
  upstreamTotal: number | null;
  qualityScore: number;
  emirate?: string;
  query?: string;
}

const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";

function productLabels(record: RecordValue): Array<{ en: string; ar: string }> {
  if (!Array.isArray(record.Products)) return [];
  return record.Products.flatMap((product) => {
    if (!product || typeof product !== "object") return [];
    const item = product as RecordValue;
    const en = text(item.ProductNameEN).replace(/^[-ـ\s]+/, "").trim();
    const ar = text(item.ProductNameAR).replace(/^[-ـ\s]+/, "").trim();
    return en || ar ? [{ en: en || ar, ar: ar || en }] : [];
  });
}

function matches(record: RecordValue, evidence: IndustryAtlasEvidence): boolean {
  const emirate = emirateFromRecord(record);
  if (evidence.emirate && normalizeText(emirate?.en ?? emirate?.ar ?? "") !== normalizeText(evidence.emirate)) return false;
  if (!evidence.query) return true;
  const haystack = [record.CompanyName, record.AreaNameEN, record.AreaNameAR, ...productLabels(record).flatMap((item) => [item.en, item.ar])]
    .map((value) => normalizeText(String(value ?? ""))).join(" ");
  return haystack.includes(normalizeText(evidence.query));
}

function percentage(value: number, total: number): number {
  return total ? Number(((value / total) * 100).toFixed(2)) : 0;
}

export function buildIndustryAtlas(input: RecordValue[], evidence: IndustryAtlasEvidence) {
  const records = input.filter((record) => matches(record, evidence));
  const emirates = new Map<string, { id: string; nameEn: string; nameAr: string; establishments: number }>();
  const areas = new Map<string, { nameEn: string; nameAr: string; emirateId: string; emirateEn: string; establishments: number }>();
  const products = new Map<string, { nameEn: string; nameAr: string; establishments: number }>();
  const map: Array<Record<string, unknown>> = [];

  for (const record of records) {
    const emirate = emirateFromRecord(record);
    if (emirate) {
      const current = emirates.get(emirate.id) ?? { id: emirate.id, nameEn: emirate.en, nameAr: emirate.ar, establishments: 0 };
      emirates.set(emirate.id, { ...current, establishments: current.establishments + 1 });
      const areaEn = text(record.AreaNameEN) || text(record.AreaNameAR) || "Unknown area";
      const areaAr = text(record.AreaNameAR) || areaEn;
      const areaKey = `${emirate.id}:${normalizeText(areaEn)}`;
      const area = areas.get(areaKey) ?? { nameEn: areaEn, nameAr: areaAr, emirateId: emirate.id, emirateEn: emirate.en, establishments: 0 };
      areas.set(areaKey, { ...area, establishments: area.establishments + 1 });
    }

    for (const product of productLabels(record)) {
      const key = normalizeText(product.en || product.ar);
      const current = products.get(key) ?? { nameEn: product.en, nameAr: product.ar, establishments: 0 };
      products.set(key, { ...current, establishments: current.establishments + 1 });
    }

    const latitude = Number(record.Latitude);
    const longitude = Number(record.Longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= 22 && latitude <= 27 && longitude >= 51 && longitude <= 57) {
      map.push({
        id: String(record.ID ?? ""), name: text(record.CompanyName), latitude, longitude,
        emirate: emirate?.en ?? null, area: text(record.AreaNameEN) || text(record.AreaNameAR) || null,
        productCount: productLabels(record).length,
      });
    }
  }

  const sortedEmirates = [...emirates.values()].sort((a, b) => b.establishments - a.establishments || a.nameEn.localeCompare(b.nameEn))
    .map((item) => ({ ...item, sharePercent: percentage(item.establishments, records.length) }));
  const sortedAreas = [...areas.values()].sort((a, b) => b.establishments - a.establishments || a.nameEn.localeCompare(b.nameEn)).slice(0, 20)
    .map((item) => ({ ...item, sharePercent: percentage(item.establishments, records.length) }));
  const sortedProducts = [...products.values()].sort((a, b) => b.establishments - a.establishments || a.nameEn.localeCompare(b.nameEn)).slice(0, 25)
    .map((item) => ({ ...item, sharePercent: percentage(item.establishments, records.length) }));
  const coverageRatio = evidence.upstreamTotal && evidence.upstreamTotal > 0 ? Number((records.length / evidence.upstreamTotal).toFixed(4)) : null;

  return {
    kind: "industry_atlas_evidence_slice",
    generatedAt: new Date().toISOString(),
    fetchedAt: evidence.fetchedAt,
    filters: { emirate: evidence.emirate ?? null, query: evidence.query ?? null },
    scope: { sampleSize: records.length, upstreamTotal: evidence.upstreamTotal, coverageRatio, completePopulation: coverageRatio === 1 },
    summary: { emiratesObserved: emirates.size, areasObserved: areas.size, productLabelsObserved: products.size, geocodedEstablishments: map.length },
    emirates: sortedEmirates,
    areas: sortedAreas,
    products: sortedProducts,
    map,
    methodology: {
      unit: "industrial_establishment_record",
      operation: "filter bounded official records, normalize emirates, count establishments and product labels",
      productCountMeaning: "number of sampled establishment records carrying the product label",
    },
    evidence: { sourceId: evidence.sourceId, citation: evidence.citation, qualityScore: evidence.qualityScore },
    limitations: [
      "Counts describe the returned sample, not the full UAE industrial population.",
      "A license record does not prove that an establishment is currently operating.",
      "Product labels may be duplicated across establishments and are not production-volume measures.",
      evidence.upstreamTotal === null ? "The upstream source did not publish a total record count for this request." : "Coverage is calculated from the upstream total reported for this request.",
    ],
    citations: [evidence.citation],
  };
}
