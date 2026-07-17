import { SETTINGS } from "./config.js";
import { ValidationError } from "./errors.js";
import { getBytes } from "./http.js";
import { parseXlsx } from "./xlsx.js";

export const EMPLOYMENT_GENDER_WORKBOOK_URL = "https://www.mohre.gov.ae/assets/download/f13f2c67/Employment%20by%20Gender%202020%20-%202024_638941250942160725.xlsx.aspx";
export const EMPLOYMENT_GENDER_CATALOGUE_URL = "https://www.mohre.gov.ae/en/open-data/open-data-plan";
export const EMPLOYMENT_GENDER_LICENSE_URL = "https://www.mohre.gov.ae/en/about-us/policies-and-conditions/open-data-policy";
export const EMPLOYMENT_GENDER_SNAPSHOT_META = {
  retrievedAt: "2026-07-17T22:56:27Z",
  sha256: "cd8a19b7c516b858701d8bd1dc38e62d6fbbd46160dd080bf6412c83d51e82b7",
  source: EMPLOYMENT_GENDER_WORKBOOK_URL,
  sourceLastUpdated: "2024-12-31",
  observations: 10,
} as const;

export type EmploymentGender = "male" | "female";

export interface EmploymentGenderObservation {
  year: number;
  gender: EmploymentGender;
  value: number;
  unit: "ratio";
}

export interface EmploymentGenderReport {
  kind: "uae_employment_gender_2020_2024";
  title: { en: string; ar: string };
  scope: {
    gender: EmploymentGender | "all";
    fromYear: number;
    toYear: number;
    returnedObservations: number;
  };
  observations: EmploymentGenderObservation[];
  source: {
    publisher: "Ministry of Human Resources and Emiratisation";
    citation: string;
    catalogue: string;
    fetchedAt: string;
    sourceLastUpdated: "2024-12-31";
    delivery: "live" | "cache" | "verified_snapshot";
    license: { name: "MOHRE Open Data Policy"; url: string; attributionRequired: true };
    sha256?: string;
  };
  methodology: string[];
  limitations: string[];
}

export type EmploymentGenderLoadOptions = Readonly<{
  fetcher?: () => Promise<Uint8Array>;
  gender?: EmploymentGender;
  fromYear?: number;
  toYear?: number;
}>;

type Delivery = EmploymentGenderReport["source"]["delivery"];
export interface LoadedEmploymentGender {
  report: EmploymentGenderReport;
  meta: Record<string, unknown>;
}

const FIRST_YEAR = 2020;
const LAST_YEAR = 2024;
const GENDERS: readonly EmploymentGender[] = ["male", "female"];
const SNAPSHOT: readonly EmploymentGenderObservation[] = [
  { year: 2020, gender: "male", value: 0.8944606554931285, unit: "ratio" },
  { year: 2020, gender: "female", value: 0.10553934450687157, unit: "ratio" },
  { year: 2021, gender: "male", value: 0.8879110651288872, unit: "ratio" },
  { year: 2021, gender: "female", value: 0.11208893487111286, unit: "ratio" },
  { year: 2022, gender: "male", value: 0.8817088992917543, unit: "ratio" },
  { year: 2022, gender: "female", value: 0.11829110070824565, unit: "ratio" },
  { year: 2023, gender: "male", value: 0.8685783126344298, unit: "ratio" },
  { year: 2023, gender: "female", value: 0.1314216873655702, unit: "ratio" },
  { year: 2024, gender: "male", value: 0.8581271671570649, unit: "ratio" },
  { year: 2024, gender: "female", value: 0.14187283284293503, unit: "ratio" },
] as const;

function validateMetadata(bytes: Uint8Array): void {
  const metadata = new Map(parseXlsx(bytes, 1, {
    dataStartRow: 2,
    columns: { key: "A", value: "B" },
  }).map((row) => [String(row.key ?? "").trim(), String(row.value ?? "").trim()]));
  if (metadata.get("Dataset Name_EN") !== "Employment by gender (2020–2024)") {
    throw new ValidationError("MOHRE employment workbook dataset identity is invalid");
  }
  if (metadata.get("Data Owner_EN") !== "Ministry of Human Resources and Emiratisation") {
    throw new ValidationError("MOHRE employment workbook data owner is invalid");
  }
  if (metadata.get("Source") !== "https://www.mohre.gov.ae") {
    throw new ValidationError("MOHRE employment workbook source is invalid");
  }
}

function validateComplete(observations: readonly EmploymentGenderObservation[]): void {
  for (let year = FIRST_YEAR; year <= LAST_YEAR; year += 1) {
    const annual = observations.filter((observation) => observation.year === year);
    if (annual.length !== 2 || !GENDERS.every((gender) => annual.some((observation) => observation.gender === gender))) {
      throw new ValidationError(`MOHRE employment workbook is incomplete for ${year}`);
    }
    if (annual.some(({ value }) => !Number.isFinite(value) || value < 0 || value > 1)) {
      throw new ValidationError(`MOHRE employment ratios for ${year} must be finite values between zero and one`);
    }
    if (Math.abs(annual.reduce((sum, { value }) => sum + value, 0) - 1) > 1e-9) {
      throw new ValidationError(`MOHRE employment ratios for ${year} must sum to one`);
    }
  }
  if (observations.length !== EMPLOYMENT_GENDER_SNAPSHOT_META.observations) {
    throw new ValidationError("MOHRE employment workbook must contain exactly five annual rows");
  }
}

export function parseMohreEmploymentGenderWorkbook(bytes: Uint8Array): EmploymentGenderObservation[] {
  validateMetadata(bytes);
  const rows = parseXlsx(bytes, 2, { headerRow: 4 });
  const observations = rows.flatMap((row, index) => {
    const year = row.Gender;
    const male = row.male;
    const female = row.female;
    if (typeof year !== "number" || !Number.isInteger(year) || year !== FIRST_YEAR + index || typeof male !== "number" || typeof female !== "number") {
      throw new ValidationError("MOHRE employment workbook contains an invalid annual row");
    }
    return [
      { year, gender: "male" as const, value: male, unit: "ratio" as const },
      { year, gender: "female" as const, value: female, unit: "ratio" as const },
    ];
  });
  validateComplete(observations);
  return observations;
}

function validateFilters(options: EmploymentGenderLoadOptions): { fromYear: number; toYear: number } {
  const fromYear = options.fromYear ?? FIRST_YEAR;
  const toYear = options.toYear ?? LAST_YEAR;
  if (options.gender !== undefined && options.gender !== "male" && options.gender !== "female") {
    throw new ValidationError("gender must be male or female");
  }
  if (!Number.isInteger(fromYear) || !Number.isInteger(toYear) || fromYear < FIRST_YEAR || toYear > LAST_YEAR) {
    throw new ValidationError("employment gender years must be between 2020 and 2024");
  }
  if (fromYear > toYear) throw new ValidationError("from_year must not be after to_year");
  return { fromYear, toYear };
}

export function buildEmploymentGenderReport(
  observations: readonly EmploymentGenderObservation[],
  options: EmploymentGenderLoadOptions & { fetchedAt: string; delivery: Delivery },
): EmploymentGenderReport {
  const { fromYear, toYear } = validateFilters(options);
  const filtered = observations
    .filter(({ year, gender }) => year >= fromYear && year <= toYear && (!options.gender || gender === options.gender))
    .map((observation) => ({ ...observation }));
  return {
    kind: "uae_employment_gender_2020_2024",
    title: { en: "MOHRE Employment by Gender", ar: "العمالة حسب النوع لدى وزارة الموارد البشرية والتوطين" },
    scope: { gender: options.gender ?? "all", fromYear, toYear, returnedObservations: filtered.length },
    observations: filtered,
    source: {
      publisher: "Ministry of Human Resources and Emiratisation",
      citation: EMPLOYMENT_GENDER_WORKBOOK_URL,
      catalogue: EMPLOYMENT_GENDER_CATALOGUE_URL,
      fetchedAt: options.fetchedAt,
      sourceLastUpdated: EMPLOYMENT_GENDER_SNAPSHOT_META.sourceLastUpdated,
      delivery: options.delivery,
      license: { name: "MOHRE Open Data Policy", url: EMPLOYMENT_GENDER_LICENSE_URL, attributionRequired: true },
      ...(options.delivery === "verified_snapshot" ? { sha256: EMPLOYMENT_GENDER_SNAPSHOT_META.sha256 } : {}),
    },
    methodology: [
      "Each value is the source-published share of employees registered in MOHRE private-sector systems for one year and gender.",
      "Male and female ratios are validated for every year and must sum to one.",
      "Year filters are inclusive; missing values are not interpolated and no forecast is produced.",
    ],
    limitations: [
      "Published ratios are not employee counts and cannot be converted into counts without a compatible annual workforce denominator.",
      "The source covers employees registered in MOHRE private-sector systems; it does not cover government employment, the whole labour force or the resident population.",
      "The source-published gender categories do not establish pay equity, job quality, seniority, occupation, nationality or labour-force participation.",
      "Changes in shares are descriptive observations and do not establish causality, policy impact or future trends.",
    ],
  };
}

let cache: { observations: readonly EmploymentGenderObservation[]; fetchedAt: string; expiresAt: number } | undefined;

export function clearEmploymentGenderCache(): void {
  cache = undefined;
}

function response(
  observations: readonly EmploymentGenderObservation[],
  options: EmploymentGenderLoadOptions,
  delivery: Delivery,
  fetchedAt: string,
  extra: Record<string, unknown> = {},
): LoadedEmploymentGender {
  const report = buildEmploymentGenderReport(observations, { ...options, fetchedAt, delivery });
  return {
    report,
    meta: {
      source_id: "mohre_employment_gender_2020_2024",
      citation: EMPLOYMENT_GENDER_WORKBOOK_URL,
      licence: { name: "MOHRE Open Data Policy", url: EMPLOYMENT_GENDER_LICENSE_URL, attribution_required: true },
      fetched_at: fetchedAt,
      delivery,
      returned_observations: report.scope.returnedObservations,
      ...extra,
    },
  };
}

export async function loadEmploymentGender(options: EmploymentGenderLoadOptions = {}): Promise<LoadedEmploymentGender> {
  validateFilters(options);
  if (cache && Date.now() < cache.expiresAt) return response(cache.observations, options, "cache", cache.fetchedAt);
  const fetcher = options.fetcher ?? (() => getBytes(EMPLOYMENT_GENDER_WORKBOOK_URL));
  try {
    const observations = parseMohreEmploymentGenderWorkbook(await fetcher());
    const fetchedAt = new Date().toISOString();
    cache = { observations, fetchedAt, expiresAt: Date.now() + Math.max(SETTINGS.cacheTtlMs, 24 * 60 * 60 * 1_000) };
    return response(observations, options, "live", fetchedAt);
  } catch (error) {
    const upstreamError = error instanceof Error ? error.message : String(error);
    validateComplete(SNAPSHOT);
    const loaded = response(SNAPSHOT, options, "verified_snapshot", EMPLOYMENT_GENDER_SNAPSHOT_META.retrievedAt, {
      sha256: EMPLOYMENT_GENDER_SNAPSHOT_META.sha256,
      upstream_error: upstreamError,
      data_quality: {
        confidence: "high",
        warnings: ["Live workbook unavailable; served the complete SHA-256-identified retained snapshot."],
        validation: {
          snapshot_sha256: EMPLOYMENT_GENDER_SNAPSHOT_META.sha256,
          expected_observations: EMPLOYMENT_GENDER_SNAPSHOT_META.observations,
          annual_ratios_sum_to_one: true,
        },
      },
    });
    loaded.report.limitations.push("The live workbook was unavailable for this request; the response uses the complete retained snapshot identified by source SHA-256.");
    return loaded;
  }
}
