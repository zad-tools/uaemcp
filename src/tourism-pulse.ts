import { SETTINGS } from "./config.js";
import { ValidationError } from "./errors.js";
import { getBytes } from "./http.js";
import { parseXlsx } from "./xlsx.js";

export const TOURISM_WORKBOOK_URL = "https://www.moet.gov.ae/documents/20121/0/Copy+of+Copy+of+%D8%A8%D9%8A%D8%A7%D9%86%D8%A7%D8%AA+%D8%A7%D9%84%D8%B3%D9%8A%D8%A7%D8%AD%D8%A9+2014-2025.xlsx?download=true";
export const TOURISM_CATALOGUE_URL = "https://www.moet.gov.ae/en/web/guest/moec-opendata";

export const TOURISM_SNAPSHOT_META = {
  retrievedAt: "2026-07-17T22:15:00Z",
  sha256: "12ddda361325e20c76fd05a403884179f98a83d9abacd3413b2e52fe39e0499a",
  source: TOURISM_WORKBOOK_URL,
} as const;

export type TourismMetric = "hotel_guest_arrivals" | "guest_nights" | "hotel_establishments" | "hotel_rooms" | "occupancy_rate";
export type TourismUnit = "million guests" | "million guest nights" | "establishments" | "rooms" | "ratio";

export interface TourismObservation {
  metric: TourismMetric;
  year: number;
  value: number;
  unit: TourismUnit;
  sheet: number;
}

type MetricDefinition = Readonly<{
  metric: TourismMetric;
  sheet: number;
  column: string;
  unit: TourismUnit;
  label: Readonly<{ en: string; ar: string }>;
}>;

const METRICS: readonly MetricDefinition[] = [
  { metric: "hotel_guest_arrivals", sheet: 3, column: "Hotel Guest Arrivals (M)", unit: "million guests", label: { en: "Hotel guest arrivals", ar: "نزلاء الفنادق" } },
  { metric: "guest_nights", sheet: 4, column: "Guest Nights (M)", unit: "million guest nights", label: { en: "Guest nights", ar: "الليالي الفندقية" } },
  { metric: "hotel_establishments", sheet: 5, column: "No.Hotel Establishments", unit: "establishments", label: { en: "Hotel establishments", ar: "المنشآت الفندقية" } },
  { metric: "hotel_rooms", sheet: 6, column: "No. Rooms", unit: "rooms", label: { en: "Hotel rooms", ar: "الغرف الفندقية" } },
  { metric: "occupancy_rate", sheet: 7, column: "Occupancy Rate %", unit: "ratio", label: { en: "Occupancy rate", ar: "معدل الإشغال" } },
] as const;

const SNAPSHOT_VALUES: Readonly<Record<TourismMetric, readonly number[]>> = {
  hotel_guest_arrivals: [19.7, 21.4, 22.9, 24.6, 25.5, 27.1, 14.9, 19.237, 25.2, 28, 30.7, 32.3],
  guest_nights: [63.7, 69.8, 73.9, 78.2, 80.3, 85, 54.3, 77.01, 91.2, 97, 104.4, 110.6],
  hotel_establishments: [1027, 1056, 1060, 1058, 1106, 1142, 1089, 1144, 1198, 1235, 1251, 1257],
  hotel_rooms: [141396, 148632, 155704, 162225, 173086, 183193, 185123, 193913, 203363, 210664, 216966, 216864],
  occupancy_rate: [0.62, 0.75, 0.75, 0.76, 0.73, 0.74, 0.55, 0.665749873596668, 0.71, 0.754, 0.779, 0.795],
};

const snapshotObservations = (): TourismObservation[] => METRICS.flatMap((definition) =>
  SNAPSHOT_VALUES[definition.metric].map((value, index) => ({
    metric: definition.metric,
    year: 2014 + index,
    value,
    unit: definition.unit,
    sheet: definition.sheet,
  })),
);

function validateComplete(observations: readonly TourismObservation[]): void {
  for (const definition of METRICS) {
    const series = observations.filter(({ metric }) => metric === definition.metric);
    if (series.length !== 12 || series.some(({ year }, index) => year !== 2014 + index)) {
      throw new ValidationError(`tourism workbook metric ${definition.metric} is incomplete; expected annual values from 2014 through 2025`);
    }
  }
}

export function parseTourismWorkbook(bytes: Uint8Array): TourismObservation[] {
  const observations = METRICS.flatMap((definition) => parseXlsx(bytes, definition.sheet, { headerRow: 2 }).flatMap((row) => {
    const year = row.Year;
    const value = row[definition.column];
    if (typeof year !== "number" || !Number.isInteger(year) || typeof value !== "number" || !Number.isFinite(value)) return [];
    return [{ metric: definition.metric, year, value, unit: definition.unit, sheet: definition.sheet }];
  }));
  validateComplete(observations);
  return observations;
}

export interface TourismPulseReport {
  kind: "uae_tourism_pulse_2014_2025";
  title: { en: string; ar: string };
  scope: { metric: TourismMetric | "all"; fromYear: number; toYear: number; returnedObservations: number };
  series: Array<{ metric: TourismMetric; label: { en: string; ar: string }; unit: TourismUnit; observations: Array<{ year: number; value: number }> }>;
  source: { publisher: "UAE Ministry of Economy and Tourism"; citation: string; fetchedAt: string; delivery?: "live" | "cache" | "verified_snapshot"; sha256?: string };
  methodology: string[];
  limitations: string[];
}

export interface TourismPulseOptions {
  metric?: TourismMetric;
  fromYear?: number;
  toYear?: number;
  citation: string;
  fetchedAt: string;
}

export function buildTourismPulse(observations: readonly TourismObservation[], options: TourismPulseOptions): TourismPulseReport {
  const fromYear = Math.max(2014, options.fromYear ?? 2014);
  const toYear = Math.min(2025, options.toYear ?? 2025);
  if (fromYear > toYear) throw new ValidationError("tourism fromYear must not be later than toYear");
  const definitions = options.metric ? METRICS.filter(({ metric }) => metric === options.metric) : METRICS;
  const series = definitions.map((definition) => ({
    metric: definition.metric,
    label: { ...definition.label },
    unit: definition.unit,
    observations: observations
      .filter(({ metric, year }) => metric === definition.metric && year >= fromYear && year <= toYear)
      .map(({ year, value }) => ({ year, value })),
  }));
  const returnedObservations = series.reduce((total, item) => total + item.observations.length, 0);
  return {
    kind: "uae_tourism_pulse_2014_2025",
    title: { en: "UAE Tourism Pulse", ar: "نبض السياحة في الإمارات" },
    scope: { metric: options.metric ?? "all", fromYear, toYear, returnedObservations },
    series,
    source: { publisher: "UAE Ministry of Economy and Tourism", citation: options.citation, fetchedAt: options.fetchedAt },
    methodology: [
      "Each observation is read from one of five metric sheets in the official 2014–2025 workbook.",
      "Values and units are preserved as published; occupancy rate remains a ratio rather than being multiplied into a percentage.",
      "Year filters are inclusive and do not interpolate missing values.",
    ],
    limitations: [
      "The workbook contains national annual aggregates and does not provide emirate-level or establishment-level records.",
      "Hotel guest arrivals are published aggregate arrivals and must not be interpreted as unique tourists without additional source evidence.",
      "The series describe published observations; they do not establish causality, profitability, investment suitability or future demand.",
    ],
  };
}

type TourismFetcher = (url: string) => Promise<Uint8Array>;
type LoadOptions = Readonly<{ fetcher?: TourismFetcher; metric?: TourismMetric; fromYear?: number; toYear?: number }>;
type Delivery = "live" | "cache" | "verified_snapshot";
export interface LoadedTourismPulse { report: TourismPulseReport; meta: Record<string, unknown> }

let cache: { expiresAt: number; observations: readonly TourismObservation[]; fetchedAt: string } | undefined;

export function clearTourismPulseCache(): void { cache = undefined; }

function response(observations: readonly TourismObservation[], options: LoadOptions, delivery: Delivery, fetchedAt: string, extra: Record<string, unknown> = {}): LoadedTourismPulse {
  const report = buildTourismPulse(observations, { metric: options.metric, fromYear: options.fromYear, toYear: options.toYear, citation: TOURISM_WORKBOOK_URL, fetchedAt });
  report.source.delivery = delivery;
  if (delivery === "verified_snapshot") report.source.sha256 = TOURISM_SNAPSHOT_META.sha256;
  return {
    report,
    meta: { source_id: "moet_tourism_2014_2025", citation: TOURISM_WORKBOOK_URL, fetched_at: fetchedAt, delivery, returned_observations: report.scope.returnedObservations, ...extra },
  };
}

export async function loadTourismPulse(options: LoadOptions = {}): Promise<LoadedTourismPulse> {
  const fetcher = options.fetcher ?? ((url: string) => getBytes(url));
  if (cache && Date.now() < cache.expiresAt) return response(cache.observations, options, "cache", cache.fetchedAt);
  try {
    const observations = parseTourismWorkbook(await fetcher(TOURISM_WORKBOOK_URL));
    const fetchedAt = new Date().toISOString();
    cache = { observations, fetchedAt, expiresAt: Date.now() + Math.max(SETTINGS.cacheTtlMs, 24 * 60 * 60 * 1_000) };
    return response(observations, options, "live", fetchedAt);
  } catch (error) {
    const upstreamError = error instanceof Error ? error.message : String(error);
    const observations = snapshotObservations();
    validateComplete(observations);
    const loaded = response(observations, options, "verified_snapshot", TOURISM_SNAPSHOT_META.retrievedAt, {
      sha256: TOURISM_SNAPSHOT_META.sha256,
      upstream_error: upstreamError,
      data_quality: { confidence: "medium", warnings: ["Live workbook unavailable; served the complete SHA-256-identified retained snapshot."], validation: { snapshot_sha256: TOURISM_SNAPSHOT_META.sha256 } },
    });
    loaded.report.limitations.push("The live workbook was unavailable for this request; the response uses the complete retained snapshot identified by source SHA-256.");
    return loaded;
  }
}
