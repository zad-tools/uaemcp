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
  { id: "city", ar: ["مدينة", "المدينة"], en: ["city", "town"], fields: ["city", "city_name", "municipality_name"] },
  { id: "administrative_region", ar: ["منطقة إدارية", "حي", "قطاع", "بلدية"], en: ["administrative region", "district", "sector", "municipality"], fields: ["region", "district", "sector", "municipality"] },
  { id: "organization", ar: ["منظمة", "مؤسسة", "جهة"], en: ["organization", "organisation", "entity", "authority"], fields: ["organization", "organisation", "entity", "owner"] },
  { id: "government_agency", ar: ["جهة حكومية", "وزارة", "هيئة", "بلدية", "دائرة"], en: ["government agency", "ministry", "authority", "municipality", "department"], fields: ["agency", "ministry", "authority", "department", "publisher"] },
  { id: "business_activity", ar: ["نشاط اقتصادي", "نشاط تجاري", "نشاط صناعي"], en: ["business activity", "economic activity", "trade activity", "industrial activity"], fields: ["business_activity", "economic_activity", "activity_type", "activity_name"] },
  { id: "property_type", ar: ["نوع العقار", "نوع الملكية", "فيلا", "شقة"], en: ["property type", "asset type", "villa", "apartment", "flat"], fields: ["property_type", "asset_type", "building_type"] },
  { id: "license_type", ar: ["نوع الرخصة", "نوع الترخيص"], en: ["license type", "licence type", "permit type"], fields: ["license_type", "licence_type", "permit_type"] },
  { id: "golden_residency", ar: ["الإقامة الذهبية", "الاقامة الذهبية", "التأشيرة الذهبية"], en: ["golden residency", "golden visa", "residence visa"], fields: ["residency", "visa", "pathway"] },
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
