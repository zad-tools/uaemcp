type RecordValue = Record<string, unknown>;
type LocalizedNullable = Readonly<{ ar: string | null; en: string | null }>;

export type PlaceName = Readonly<{
  id: string;
  name: LocalizedNullable;
  category: LocalizedNullable;
  description: LocalizedNullable;
  coordinates: Readonly<{ longitude: number; latitude: number }> | null;
}>;

export type PlaceNamesProduct = Readonly<{
  query: string;
  returned: number;
  mapped: number;
  places: readonly PlaceName[];
  evidence: Readonly<{ sourceId: "fgic_national_gazetteer"; citation: string; fetchedAt: string }>;
  limitations: Readonly<{ en: readonly string[]; ar: readonly string[] }>;
  lineage: readonly Readonly<{ operation: string; connector?: string; excludedFields?: readonly string[] }>[];
}>;

const text = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean ? clean : null;
};

const number = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function coordinates(record: RecordValue): PlaceName["coordinates"] {
  const geometry = record._geometry && typeof record._geometry === "object" ? record._geometry as RecordValue : null;
  const pair = Array.isArray(geometry?.coordinates) ? geometry.coordinates : null;
  const longitude = number(pair?.[0] ?? record.point_x);
  const latitude = number(pair?.[1] ?? record.point_y);
  if (longitude === null || latitude === null || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return null;
  return { longitude, latitude };
}

function normalize(record: RecordValue, index: number): PlaceName {
  const sourceId = number(record.objectid) ?? number(record.objectidorig) ?? index + 1;
  return {
    id: `fgic:${sourceId}`,
    name: { ar: text(record.gazetteername) ?? text(record.wotaltah), en: text(record.englishname) },
    category: { ar: text(record.category), en: text(record.categoryeng) },
    description: { ar: text(record.description), en: null },
    coordinates: coordinates(record),
  };
}

export function buildPlaceNamesProduct(
  records: readonly RecordValue[],
  context: Readonly<{ query: string; citation: string; fetchedAt: string }>,
): PlaceNamesProduct {
  const places = records.map(normalize);
  return {
    query: context.query,
    returned: places.length,
    mapped: places.filter((place) => place.coordinates !== null).length,
    places,
    evidence: { sourceId: "fgic_national_gazetteer", citation: context.citation, fetchedAt: context.fetchedAt },
    limitations: {
      en: [
        "Results are a bounded live query, not the complete national gazetteer.",
        "FGIC publishes the information as-is without guaranteeing currency or accuracy.",
        "Place points are not an authoritative reference for administrative or international boundaries.",
      ],
      ar: [
        "النتائج استعلام مباشر محدود وليست المعجم الجغرافي الوطني كاملًا.",
        "ينشر المركز المعلومات كما هي دون ضمان الحداثة أو الدقة.",
        "نقاط الأماكن ليست مرجعًا معتمدًا للحدود الإدارية أو الدولية.",
      ],
    },
    lineage: [
      { operation: "fetch", connector: "arcgis" },
      { operation: "normalize_fgic_place_names", excludedFields: ["descriptioneng"] },
    ],
  };
}
