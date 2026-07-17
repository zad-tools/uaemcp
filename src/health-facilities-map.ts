type Row = Readonly<Record<string, unknown>>;

export interface HealthFacilitiesMapOptions {
  q?: string;
  bbox?: readonly [number, number, number, number];
  near?: readonly [number, number, number];
  limit?: number;
}

export function parseCoordinator(value: unknown): { latitude: number; longitude: number } | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < 22 || latitude > 27 || longitude < 51 || longitude > 57) return null;
  return { latitude, longitude };
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(bLat - aLat);
  const dLon = radians(bLon - aLon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function buildHealthFacilitiesMap(
  rows: ReadonlyArray<Row>,
  options: HealthFacilitiesMapOptions & { citation: string; fetchedAt: string },
) {
  const limit = options.limit ?? 200;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("limit must be an integer from 1 to 1000");
  if (options.bbox) {
    const [west, south, east, north] = options.bbox;
    if (![west, south, east, north].every(Number.isFinite) || west < -180 || east > 180 || south < -90 || north > 90 || west > east || south > north) throw new Error("bbox must be [west,south,east,north] with valid ordered coordinates");
  }
  if (options.near) {
    const [latitude, longitude, radiusKm] = options.near;
    if (![latitude, longitude, radiusKm].every(Number.isFinite) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || radiusKm <= 0 || radiusKm > 500) throw new Error("near must contain valid latitude, longitude and radius from 0 to 500 km");
  }
  const query = options.q?.trim().toLocaleLowerCase() ?? "";
  const excludedReasons = rows.reduce<{ blank: number; sentinel: number; malformedOrOutsideUae: number }>((counts, row) => {
    const value = row.Coordinator;
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return { ...counts, blank: counts.blank + 1 };
    if (typeof value === "string" && /^\s*90(?:\.0+)?\s*,\s*90(?:\.0+)?\s*$/.test(value)) return { ...counts, sentinel: counts.sentinel + 1 };
    if (!parseCoordinator(value)) return { ...counts, malformedOrOutsideUae: counts.malformedOrOutsideUae + 1 };
    return counts;
  }, { blank: 0, sentinel: 0, malformedOrOutsideUae: 0 });
  const parsed = rows.flatMap((row, index) => {
    const coordinate = parseCoordinator(row.Coordinator);
    if (!coordinate) return [];
    const nameEn = text(row["Facility Name English"]);
    const nameAr = text(row["Facility Name Arabic"]);
    if (!nameEn && !nameAr) return [];
    const rawId = row["No."];
    const id = typeof rawId === "number" || typeof rawId === "string" ? rawId : index + 1;
    return [{ id, nameEn, nameAr, ...coordinate }];
  });
  let matched = parsed.filter((feature) => !query || `${feature.nameEn} ${feature.nameAr}`.toLocaleLowerCase().includes(query));
  if (options.bbox) {
    const [west, south, east, north] = options.bbox;
    matched = matched.filter(({ latitude, longitude }) => longitude >= west && longitude <= east && latitude >= south && latitude <= north);
  }
  const withDistance = options.near
    ? matched.map((feature) => ({ ...feature, distanceKm: Number(distanceKm(options.near![0], options.near![1], feature.latitude, feature.longitude).toFixed(3)) }))
      .filter(({ distanceKm }) => distanceKm <= options.near![2]).sort((left, right) => left.distanceKm - right.distanceKm)
    : matched;
  const features = query || options.bbox || options.near ? withDistance.slice(0, limit) : evenSample(withDistance, limit);
  const uniqueNamedCoordinates = new Set(parsed.map(({ nameEn, nameAr, latitude, longitude }) => `${nameEn}\u0000${nameAr}\u0000${latitude}\u0000${longitude}`)).size;
  const uniqueCoordinatePairs = new Set(parsed.map(({ latitude, longitude }) => `${latitude}\u0000${longitude}`)).size;
  return {
    kind: "uae_health_facilities_gis",
    generatedAt: options.fetchedAt,
    scope: { sourceRows: rows.length, geocodedRows: parsed.length, omittedWithoutValidCoordinates: rows.length - parsed.length, excludedReasons, uniqueNamedCoordinates, uniqueCoordinatePairs, matched: withDistance.length, returned: features.length },
    features,
    evidence: { citation: options.citation, fields: ["Facility Name English", "Facility Name Arabic", "Coordinator"] },
    limitations: [
      "This surface contains source-published facility names and coordinates only; it does not establish facility type, licensing status, service quality or capacity.",
      "A map point is discovery evidence, not confirmation that a facility is currently operating or suitable for a particular service.",
      "Rows without a valid source coordinate are omitted and reported in the scope rather than geocoded or guessed.",
    ],
  } as const;
}

function evenSample<T>(values: readonly T[], limit: number): T[] {
  if (values.length <= limit) return [...values];
  if (limit === 1) return [values[0]!];
  return Array.from({ length: limit }, (_, index) =>
    values[Math.floor((index * (values.length - 1)) / (limit - 1))]!,
  );
}
