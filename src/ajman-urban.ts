type Row = Record<string, unknown>;

export const AJMAN_URBAN_DATASETS = [
  "licenses-issued-for-new-buildings-by-number-of-buildings",
  "building-licenses-by-license-type",
  "certified-rent-contracts-in-ajman",
  "certified-rent-contracts-in-masfoot",
  "the-length-of-the-new-roads-added-in-the-emirate",
  "developed-crossroads",
] as const;

type DatasetId = typeof AJMAN_URBAN_DATASETS[number];
export interface AjmanUrbanDatasetEvidence { dataset: DatasetId; records: Row[]; total: number | null; license?: string; dataQuality?: Record<string, unknown> }

const numeric = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
};
const yearOf = (value: unknown): number | null => {
  const parsed = numeric(value);
  return parsed !== null && Number.isInteger(parsed) && parsed >= 1900 && parsed <= 2100 ? parsed : null;
};
const arabic = (value: string): boolean => /[\u0600-\u06ff]/.test(value);
const label = (row: Row, enField: string, arField: string) => {
  const first = String(row[enField] ?? "Unknown").trim() || "Unknown";
  const second = String(row[arField] ?? first).trim() || first;
  if (arabic(first) && !arabic(second)) return { nameEn: second, nameAr: first };
  return { nameEn: first, nameAr: arabic(second) ? second : first };
};
function annual(rows: Row[], valueField: string, unit: string) {
  const totals = new Map<number, number>();
  for (const row of rows) {
    const observedYear = yearOf(row.year), value = numeric(row[valueField]);
    if (observedYear !== null && value !== null) totals.set(observedYear, (totals.get(observedYear) ?? 0) + value);
  }
  return [...totals.entries()].sort((a, b) => a[0] - b[0]).map(([year, value]) => ({ year, value: Number(value.toFixed(3)), unit }));
}
function weighted(rows: Row[], enField: string, arField: string, valueField: string) {
  const groups = new Map<string, { nameEn: string; nameAr: string; value: number }>();
  for (const row of rows) {
    const names = label(row, enField, arField), value = numeric(row[valueField]);
    if (value === null) continue;
    const key = `${names.nameEn}|${names.nameAr}`;
    const current = groups.get(key) ?? { ...names, value: 0 };
    groups.set(key, { ...current, value: current.value + value });
  }
  return [...groups.values()].sort((a, b) => b.value - a.value || a.nameEn.localeCompare(b.nameEn)).map((item) => ({ ...item, value: Number(item.value.toFixed(3)) }));
}

export function buildAjmanUrbanEvidence(datasets: AjmanUrbanDatasetEvidence[], evidence: { citation: string; fetchedAt: string }) {
  const byId = new Map(datasets.map((item) => [item.dataset, item.records]));
  const newBuildings = byId.get(AJMAN_URBAN_DATASETS[0]) ?? [], buildingLicenses = byId.get(AJMAN_URBAN_DATASETS[1]) ?? [];
  const ajmanRent = byId.get(AJMAN_URBAN_DATASETS[2]) ?? [], masfoutRent = byId.get(AJMAN_URBAN_DATASETS[3]) ?? [];
  const roads = byId.get(AJMAN_URBAN_DATASETS[4]) ?? [], crossroads = byId.get(AJMAN_URBAN_DATASETS[5]) ?? [];
  const licenseValue = "building_licenses_issued_classified_by_license_type_in_the_emirate_of_ajman";
  return {
    kind: "ajman_urban_evidence", generatedAt: new Date().toISOString(), fetchedAt: evidence.fetchedAt,
    geography: { emirate: "Ajman", emirateAr: "عجمان", country: "United Arab Emirates" },
    scope: { datasets: datasets.map((item) => ({ id: item.dataset, returnedRecords: item.records.length, upstreamRecords: item.total, coverageRatio: item.total && item.total > 0 ? Number((item.records.length / item.total).toFixed(6)) : null, completePopulation: item.total !== null && item.records.length === item.total })) },
    views: {
      newBuildings: { dataset: AJMAN_URBAN_DATASETS[0], annual: annual(newBuildings, "value", "buildings"), categories: weighted(newBuildings, "category_1_en", "category_1_ar", "value") },
      buildingLicenses: { dataset: AJMAN_URBAN_DATASETS[1], annual: annual(buildingLicenses, licenseValue, "licenses"), types: weighted(buildingLicenses, "type_of_license_en", "type_of_license_ar", licenseValue) },
      ajmanRent: { dataset: AJMAN_URBAN_DATASETS[2], annual: annual(ajmanRent, "total_of_certified_rent_contracts_in_ajman_city", "certified contracts"), categories: weighted(ajmanRent, "contract_category_en", "contract_category_ar", "total_of_certified_rent_contracts_in_ajman_city") },
      masfoutRent: { dataset: AJMAN_URBAN_DATASETS[3], annual: annual(masfoutRent, "total_of_certified_rent_contracts_in_masfout_city", "certified contracts"), categories: weighted(masfoutRent, "contract_category_en", "contract_category_ar", "total_of_certified_rent_contracts_in_masfout_city") },
      roads: { dataset: AJMAN_URBAN_DATASETS[4], annual: annual(roads, "the_length_of_the_new_road_added_in_the_emirate_km", "km") },
      crossroads: { dataset: AJMAN_URBAN_DATASETS[5], annual: annual(crossroads, "total_number_of_developed_crossroads", "developed crossroads") },
    },
    methodology: { operation: "sum source-published numeric measures by source-native year inside each separately bounded returned sample", crossDatasetAggregation: false },
    evidence: { sourceId: "ajman_data_portal", citation: evidence.citation, datasetIds: [...AJMAN_URBAN_DATASETS], lineage: datasets.map((item) => ({ operation: "fetch_and_group_by_year", connector: "opendatasoft", dataset: item.dataset, rows: item.records.length })) },
    limitations: [
      "The six datasets describe different services and units and must not be combined into one urban-development total.",
      "Annual observations are calculated from at most 100 returned rows per dataset and may not cover every published row or period.",
      "Annual values sum source-published rows; they are not property prices, investment returns, population growth or construction value.",
      "A completePopulation flag means the published dataset rows were retrieved, not that the dataset covers every real-world event.",
      "Ajman and Masfout rent-contract series remain separate and must not be treated as the full UAE rental market.",
    ],
    citations: [evidence.citation],
  };
}
