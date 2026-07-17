export interface Concept {
  id: string;
  ar: string[];
  en: string[];
  fields: string[];
}

export const GLOSSARY: Concept[] = [
  { id: "emirate", ar: ["إمارة", "الامارة", "الإمارات"], en: ["emirate", "emirates", "state"], fields: ["emirate", "emiratenameen", "emiratenamear"] },
  { id: "commercial_license", ar: ["رخصة تجارية", "رخصة اقتصادية", "ترخيص تجاري"], en: ["commercial license", "trade licence", "trade license", "economic licence"], fields: ["license_type", "licensetype", "activity_type"] },
  { id: "industrial_license", ar: ["رخصة صناعية", "ترخيص صناعي", "مصنع", "مصانع"], en: ["industrial license", "industrial licence", "factory", "factories"], fields: ["license", "factory", "products"] },
  { id: "real_estate", ar: ["عقارات", "عقار", "أراضي", "ايجارات", "إيجارات"], en: ["real estate", "property", "land", "rentals"], fields: ["property_type", "land", "rent"] },
  { id: "area", ar: ["منطقة", "مدينة", "حي"], en: ["area", "city", "district"], fields: ["area", "city", "district"] },
];

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function expandQuery(query: string): string[] {
  const normalized = normalizeText(query);
  const terms = new Set([normalized]);
  for (const concept of GLOSSARY) {
    const labels = [...concept.ar, ...concept.en].map(normalizeText);
    if (labels.some((label) => normalized.includes(label) || label.includes(normalized))) {
      labels.forEach((label) => terms.add(label));
    }
  }
  return [...terms];
}

export function recognizeConcepts(query: string): string[] {
  const normalized = normalizeText(query);
  return GLOSSARY.filter((concept) => [...concept.ar, ...concept.en].some((label) => normalized.includes(normalizeText(label)))).map((concept) => concept.id);
}

export function semanticType(field: string): string | null {
  const normalized = normalizeText(field).replace(/ /g, "");
  return GLOSSARY.find((concept) => concept.fields.some((candidate) => normalized.includes(normalizeText(candidate).replace(/ /g, ""))))?.id ?? null;
}
