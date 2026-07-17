import { ValidationError } from "./errors.js";

type RawRow = Readonly<Record<string, unknown>>;

export const HEALTH_FACILITY_YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024] as const;
export const HEALTH_FACILITY_EMIRATES = ["Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaima", "Sharjah", "Umm Al Quwain"] as const;
export const HEALTH_FACILITY_SECTORS = ["Government", "Private"] as const;

export interface HealthFacilitiesOptions {
  citation: string;
  fetchedAt: string;
  year?: number;
  emirate?: string;
  sector?: "Government" | "Private";
  category?: string;
  facilityType?: string;
  query?: string;
  rowLimit?: number;
}

interface FacilityRow {
  year: number;
  emirateEn: string;
  emirateAr: string;
  sectorEn: string;
  sectorAr: string;
  categoryEn: string;
  categoryAr: string;
  facilityTypeEn: string;
  facilityTypeAr: string;
  total: number;
}

function text(row: RawRow, key: string): string {
  return typeof row[key] === "string" ? row[key].trim() : "";
}

function normalize(row: RawRow): FacilityRow {
  const year = Number(row.Year);
  const total = Number(row.Total);
  const normalized = {
    year,
    emirateEn: text(row, "Emirate En"),
    emirateAr: text(row, "Emirate Ar"),
    sectorEn: text(row, "Sector En"),
    sectorAr: text(row, "Sector Ar"),
    categoryEn: text(row, "Main Category_En"),
    categoryAr: text(row, "Main Category_Ar"),
    facilityTypeEn: text(row, "Facility Type En"),
    facilityTypeAr: text(row, "Facility Type Ar"),
    total,
  };
  if (!Number.isInteger(year) || year < 1900 || !Number.isFinite(total) || total < 0 || !normalized.emirateEn || !normalized.sectorEn || !normalized.facilityTypeEn) {
    throw new ValidationError("invalid health facilities row");
  }
  return normalized;
}

function aggregate(rows: readonly FacilityRow[], en: keyof FacilityRow, ar: keyof FacilityRow) {
  const groups = new Map<string, { nameEn: string; nameAr: string; publishedFacilityCount: number; sourceRows: number }>();
  for (const row of rows) {
    const nameEn = String(row[en]);
    const nameAr = String(row[ar]);
    const current = groups.get(nameEn) ?? { nameEn, nameAr, publishedFacilityCount: 0, sourceRows: 0 };
    groups.set(nameEn, { ...current, publishedFacilityCount: current.publishedFacilityCount + row.total, sourceRows: current.sourceRows + 1 });
  }
  return [...groups.values()].sort((a, b) => b.publishedFacilityCount - a.publishedFacilityCount || a.nameEn.localeCompare(b.nameEn));
}

export function buildHealthFacilitiesAtlas(records: readonly RawRow[], options: HealthFacilitiesOptions) {
  const rows = records.map(normalize);
  const years = [...new Set(rows.map((row) => row.year))].sort((a, b) => a - b);
  if (!years.length) throw new ValidationError("health facilities dataset contains no rows");
  const selectedYear = options.year ?? years.at(-1)!;
  const query = options.query?.trim().toLocaleLowerCase() ?? "";
  const base = rows.filter((row) => {
    if (options.emirate && row.emirateEn.toLocaleLowerCase() !== options.emirate.toLocaleLowerCase()) return false;
    if (options.sector && row.sectorEn !== options.sector) return false;
    if (options.category && row.categoryEn !== options.category) return false;
    if (options.facilityType && row.facilityTypeEn !== options.facilityType) return false;
    if (!query) return true;
    return [row.emirateEn, row.emirateAr, row.sectorEn, row.sectorAr, row.categoryEn, row.categoryAr, row.facilityTypeEn, row.facilityTypeAr]
      .some((value) => value.toLocaleLowerCase().includes(query));
  });
  const selected = base.filter((row) => row.year === selectedYear);
  const rowLimit = Math.max(1, Math.min(options.rowLimit ?? 100, 200));
  const sum = (items: readonly FacilityRow[]) => items.reduce((total, row) => total + row.total, 0);
  const timeline = years.map((year) => ({ year, publishedFacilityCount: sum(base.filter((row) => row.year === year)) }));

  return {
    kind: "uae_health_facilities_atlas",
    title: { en: "UAE Health Facilities Atlas", ar: "أطلس المنشآت الصحية في الإمارات" },
    scope: {
      publishedRows: rows.length,
      years,
      selectedYear,
      matchedRows: selected.length,
      publishedFacilityCount: sum(selected),
      returnedEvidenceRows: Math.min(selected.length, rowLimit),
      filters: { emirate: options.emirate ?? null, sector: options.sector ?? null, category: options.category ?? null, facilityType: options.facilityType ?? null, query: options.query ?? null },
    },
    emirates: aggregate(selected, "emirateEn", "emirateAr"),
    sectors: aggregate(selected, "sectorEn", "sectorAr"),
    categories: aggregate(selected, "categoryEn", "categoryAr"),
    facilityTypes: aggregate(selected, "facilityTypeEn", "facilityTypeAr"),
    timeline,
    evidenceRows: selected.slice(0, rowLimit),
    evidence: { sourceId: "mohap_health_facilities_2024", citation: options.citation, fetchedAt: options.fetchedAt, unit: "published aggregate facility count", sourceRows: records.length },
    methodology: [
      "Each source row is an aggregate count for one year, emirate, sector, main category and facility-type combination.",
      "Published facility counts are summed only inside the selected source-native dimensions.",
      "The timeline uses the same dimension filters while retaining every published year.",
    ],
    limitations: [
      "The 950 rows are aggregate observations, not 950 individual facilities.",
      "The repeated emirate coordinates are geographic reference points, not facility locations, and are not mapped.",
      "Counts do not measure beds, workforce, patients, capacity, accessibility, quality or health outcomes.",
      "The embedded metadata says 2015–2022 and last updated 2022 even though the data sheet contains 2023 and 2024 rows; this inconsistency is preserved as a warning.",
      "A difference between years describes the published aggregate only and is not attributed to openings, closures, policy or performance.",
    ],
  } as const;
}
