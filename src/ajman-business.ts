import { normalizeText } from "./glossary.js";

type Row = Record<string, unknown>;

export const AJMAN_BUSINESS_DATASETS = [
  "license-in-ajman-activities",
  "license-in-ajman-area",
  "companies-by-license-type",
] as const;

export interface AjmanBusinessDatasetEvidence {
  dataset: typeof AJMAN_BUSINESS_DATASETS[number];
  records: Row[];
  total: number | null;
  citation?: string;
  license?: string;
  fetchedAt?: string;
  dataQuality?: Record<string, unknown>;
}

const clean = (value: unknown): string => typeof value === "string" && value.trim() ? value.trim() : "Unknown";
const share = (count: number, total: number): number => total ? Number(((count / total) * 100).toFixed(2)) : 0;

function rank(rows: Row[], englishField: string, arabicField?: string, top = 20) {
  const groups = new Map<string, { nameEn: string; nameAr: string; records: number }>();
  for (const row of rows) {
    const nameEn = clean(row[englishField]);
    const nameAr = arabicField ? clean(row[arabicField]) : nameEn;
    const key = normalizeText(nameEn === "Unknown" ? nameAr : nameEn);
    const current = groups.get(key) ?? { nameEn, nameAr: nameAr === "Unknown" ? nameEn : nameAr, records: 0 };
    groups.set(key, { ...current, records: current.records + 1 });
  }
  return [...groups.values()].sort((a, b) => b.records - a.records || a.nameEn.localeCompare(b.nameEn)).slice(0, top)
    .map((item) => ({ ...item, sampleSharePercent: share(item.records, rows.length) }));
}

function year(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = Number(value.slice(0, 4));
  return Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2100 ? parsed : null;
}

function years(rows: Row[], field: string) {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const observed = year(row[field]);
    if (observed !== null) counts.set(observed, (counts.get(observed) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[0] - a[0])
    .map(([observedYear, observedRecords]) => ({ year: observedYear, observedRecords }));
}

export function buildAjmanBusinessEvidence(
  datasets: AjmanBusinessDatasetEvidence[],
  evidence: { citation: string; fetchedAt: string; query?: string | null },
) {
  const byId = new Map(datasets.map((item) => [item.dataset, item]));
  const activities = byId.get("license-in-ajman-activities")?.records ?? [];
  const areas = byId.get("license-in-ajman-area")?.records ?? [];
  const companies = byId.get("companies-by-license-type")?.records ?? [];
  return {
    kind: "ajman_business_evidence",
    generatedAt: new Date().toISOString(),
    fetchedAt: evidence.fetchedAt,
    geography: { emirate: "Ajman", emirateAr: "عجمان", country: "United Arab Emirates" },
    filters: { query: evidence.query ?? null },
    scope: {
      datasets: datasets.map((item) => ({
        id: item.dataset, sampledRecords: item.records.length, upstreamRecords: item.total,
        coverageRatio: item.total && item.total > 0 ? Number((item.records.length / item.total).toFixed(6)) : null,
        completePopulation: item.total !== null && item.records.length === item.total,
      })),
      viewsAreDistinct: true,
    },
    views: {
      activity: {
        dataset: "license-in-ajman-activities",
        activities: rank(activities, "activitiyen", "activitiyar", 25),
        licenseTypes: rank(activities, "licensetypeen", "licensetypear", 12),
        legalForms: rank(activities, "legalformen", "legalformar", 15),
        startYears: years(activities, "startdate"),
      },
      area: {
        dataset: "license-in-ajman-area",
        areas: rank(areas, "areaen", "areaar", 25),
        licenseTypes: rank(areas, "licensetypeen", "licensetypear", 12),
        legalForms: rank(areas, "legalformen", "legalformar", 15),
        startYears: years(areas, "startdate"),
      },
      status: {
        dataset: "companies-by-license-type",
        statuses: rank(companies, "company_status", undefined, 10),
        licenseTypes: rank(companies, "license_type", undefined, 12),
        stateYears: years(companies, "license_state_date"),
      },
    },
    methodology: {
      unit: "source-published license-view record",
      operation: "rank categorical fields inside three separately bounded official Ajman dataset samples",
      dateRule: "year is read from source-native startdate or license_state_date; it is not a growth measure",
    },
    evidence: {
      sourceId: "ajman_data_portal", citation: evidence.citation,
      datasetIds: datasets.map((item) => item.dataset),
      licenses: [...new Set(datasets.map((item) => item.license).filter(Boolean))],
      qualityScore: datasets.length ? Number((datasets.reduce((sum, item) => sum + Number(item.dataQuality?.quality_score ?? 0), 0) / datasets.length).toFixed(3)) : null,
      lineage: datasets.map((item) => ({ operation: "fetch_and_rank", connector: "opendatasoft", dataset: item.dataset, sampleSize: item.records.length })),
    },
    limitations: [
      "The three datasets are different published views and are not unique companies; their records must never be added together.",
      "Rankings describe bounded returned samples unless a dataset coverageRatio equals 1.",
      "A published license record does not prove that a business is currently operating, available, solvent or suitable for investment.",
      "Start-year observations are not business formation, survival or growth statistics.",
      "This evidence covers Ajman datasets, not the full UAE business population.",
    ],
    citations: [evidence.citation],
  };
}
