type Row = Record<string, unknown>;
type Delivery = "live" | "snapshot";

const numberValue = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
const yearValue = (value: unknown): number | null => {
  const parsed = numberValue(value);
  return parsed !== null && Number.isInteger(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : null;
};

export function buildAjmanParksEvidence(rows: Row[], evidence: { fetchedAt: string; delivery: Delivery; upstreamRecords: number | null }) {
  const annual = new Map<number, number>();
  const parks = new Map<string, { nameEn: string; nameAr: string; visits: number }>();
  let validRows = 0, excludedRows = 0, total = 0;
  for (const row of rows) {
    const year = yearValue(row.year), visits = numberValue(row.numne_of_parks_visitors);
    const nameEn = String(row.park_name_en ?? "").trim(), nameAr = String(row.park_name_ar ?? "").trim();
    if (year === null || visits === null || !nameEn || !nameAr) { excludedRows++; continue; }
    validRows++; total += visits;
    annual.set(year, (annual.get(year) ?? 0) + visits);
    const key = `${nameEn}|${nameAr}`;
    const current = parks.get(key) ?? { nameEn, nameAr, visits: 0 };
    parks.set(key, { ...current, visits: current.visits + visits });
  }
  const annualRows = [...annual.entries()].sort((a, b) => a[0] - b[0]).map(([year, visits]) => ({ year, visits }));
  const parkRows = [...parks.values()].sort((a, b) => b.visits - a.visits || a.nameEn.localeCompare(b.nameEn));
  return {
    kind: "ajman_parks_footfall", generatedAt: new Date().toISOString(), fetchedAt: evidence.fetchedAt,
    delivery: evidence.delivery === "live" ? "live" : "verified_snapshot",
    geography: { emirate: "Ajman", emirateAr: "عجمان", country: "United Arab Emirates" },
    summary: { publishedVisitObservations: total, validRows, excludedRows, years: annualRows.length, parks: parkRows.length },
    annual: annualRows, parks: parkRows,
    scope: { dataset: "parks-visitors-in-ajman", upstreamRecords: evidence.upstreamRecords, returnedRecords: rows.length, completePopulation: evidence.upstreamRecords !== null && rows.length === evidence.upstreamRecords, period: annualRows.length ? { from: annualRows[0]!.year, to: annualRows.at(-1)!.year } : null, unit: "source-published park visits" },
    methodology: { operation: "sum valid source-published monthly visit observations by year and source-native park label", deduplication: false, uniquePeople: false, crossDatasetAggregation: false },
    evidence: { sourceId: "ajman_data_portal", datasetId: "parks-visitors-in-ajman", publisher: "Municipality & Planning Department", license: "CC BY 4.0", citation: "https://data.ajman.ae/explore/dataset/parks-visitors-in-ajman/" },
    limitations: [
      "Published visit observations are not unique people; repeat visits may be counted more than once.",
      "The dataset does not measure satisfaction, demand, park quality, capacity, resident population or tourism performance.",
      "Totals sum valid source-published rows without deduplication or interpolation; malformed and negative values are excluded and counted.",
      "A completePopulation flag covers the portal's published rows, not every real-world park visit.",
      "Park labels remain source-native; similar labels are not merged without an explicit semantic mapping.",
    ],
    citations: ["https://data.ajman.ae/explore/dataset/parks-visitors-in-ajman/"],
  } as const;
}
