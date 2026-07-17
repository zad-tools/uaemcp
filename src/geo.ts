/**
 * Geospatial filtering + GeoJSON output — the layer that makes map apps possible.
 * Handles flat lat/lon (MOIAT), ArcGIS `_geometry`, and ODS `geo_point_2d`.
 * Returns points as [lon, lat] (GeoJSON axis order).
 */

import type { Source } from "./sources.js";

type Rec = Record<string, unknown>;
export type Point = [number, number]; // [lon, lat]
export type Bbox = [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
export type Near = [number, number, number]; // [lon, lat, radiusKm]

function num(value: unknown): number | null {
  const f = typeof value === "number" ? value : Number(value);
  return Number.isFinite(f) ? f : null;
}

export function extractPoint(record: Rec, source: Source): Point | null {
  const geoCfg = source.connector_config?.geo as { lat_field?: string; lon_field?: string } | undefined;
  if (geoCfg && typeof geoCfg === "object") {
    const lat = num(record[geoCfg.lat_field ?? ""]);
    const lon = num(record[geoCfg.lon_field ?? ""]);
    if (lat !== null && lon !== null) return [lon, lat];
  }
  const geom = record._geometry as Rec | undefined;
  if (geom && typeof geom === "object" && geom.type === "Point" && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
    const lon = num(geom.coordinates[0]);
    const lat = num(geom.coordinates[1]);
    if (lon !== null && lat !== null) return [lon, lat];
  }
  const gp = record.geo_point_2d;
  if (gp && typeof gp === "object" && !Array.isArray(gp)) {
    const lat = num((gp as Rec).lat);
    const lon = num((gp as Rec).lon);
    if (lat !== null && lon !== null) return [lon, lat];
  }
  if (Array.isArray(gp) && gp.length >= 2) {
    const lat = num(gp[0]);
    const lon = num(gp[1]);
    if (lat !== null && lon !== null) return [lon, lat];
  }
  return null;
}

export function haversineKm(a: Point, b: Point): number {
  const r = 6371.0088;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlmb = ((lon2 - lon1) * Math.PI) / 180;
  const h = Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dlmb / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function inBbox(pt: Point, bbox: Bbox): boolean {
  const [lon, lat] = pt;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

export function inPolygon(pt: Point, ring: Point[]): boolean {
  const [lon, lat] = pt;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function toGeoJson(records: Rec[], source: Source, dataset: string | null = null): Rec {
  const features: Rec[] = [];
  for (const rec of records) {
    const pt = extractPoint(rec, source);
    if (!pt) continue;
    const props: Rec = {};
    for (const [k, v] of Object.entries(rec)) if (k !== "_geometry") props[k] = v;
    features.push({ type: "Feature", geometry: { type: "Point", coordinates: [pt[0], pt[1]] }, properties: props });
  }
  return { type: "FeatureCollection", features, metadata: { source_id: source.id, dataset, count: features.length } };
}

export function parseBbox(raw: string): Bbox {
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error("bbox must be 'min_lon,min_lat,max_lon,max_lat'");
  }
  const [minLon, minLat, maxLon, maxLat] = parts;
  if (minLon > maxLon || minLat > maxLat) throw new Error("bbox min must be <= max on each axis");
  return [minLon, minLat, maxLon, maxLat];
}

export function parseNear(raw: string): Near {
  const parts = raw.split(",").map((p) => Number(p.trim()));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) throw new Error("near must be 'lat,lon,radius_km'");
  const [lat, lon, radius] = parts;
  if (radius <= 0) throw new Error("radius_km must be > 0");
  return [lon, lat, radius];
}

export function parsePolygon(raw: string): Point[] {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("polygon must be a JSON array of [lon,lat] points"); }
  const coordinates = parsed && typeof parsed === "object" && !Array.isArray(parsed) && (parsed as Rec).type === "Polygon"
    ? ((parsed as Rec).coordinates as unknown[])?.[0]
    : parsed;
  if (!Array.isArray(coordinates) || coordinates.length < 3) throw new Error("polygon must contain at least three [lon,lat] points");
  const points = coordinates.map((point) => {
    if (!Array.isArray(point) || point.length < 2) throw new Error("polygon positions must be [lon,lat]");
    const lon = num(point[0]); const lat = num(point[1]);
    if (lon === null || lat === null || lon < -180 || lon > 180 || lat < -90 || lat > 90) throw new Error("polygon contains an invalid coordinate");
    return [lon, lat] as Point;
  });
  return points;
}

export function filterRecords(records: Rec[], source: Source, opts: { bbox?: Bbox; near?: Near; polygon?: Point[] } = {}): Rec[] {
  if (!opts.bbox && !opts.near && !opts.polygon) return records;
  const out: Rec[] = [];
  for (const rec of records) {
    const pt = extractPoint(rec, source);
    if (!pt) continue;
    if (opts.bbox && !inBbox(pt, opts.bbox)) continue;
    if (opts.polygon && !inPolygon(pt, opts.polygon)) continue;
    if (opts.near && haversineKm([opts.near[0], opts.near[1]], pt) > opts.near[2]) continue;
    out.push(rec);
  }
  return out;
}

export function parseLatLon(raw: string): Point {
  const parts = raw.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) throw new Error("point must be 'lat,lon'");
  const [lat, lon] = parts;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error("point contains an invalid coordinate");
  return [lon, lat];
}

export function nearestRecords(records: Rec[], source: Source, point: Point, limit = 10): Rec[] {
  return records.flatMap((record) => {
    const candidate = extractPoint(record, source);
    return candidate ? [{ ...record, _distance_km: Number(haversineKm(point, candidate).toFixed(3)) }] : [];
  }).sort((left, right) => Number(left._distance_km) - Number(right._distance_km)).slice(0, Math.max(0, limit));
}

export function spatialJoin(leftRecords: Rec[], leftSource: Source, rightRecords: Rec[], rightSource: Source, radiusKm: number, maxMatches = 1000): Rec[] {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 500) throw new Error("join radius_km must be between 0 and 500");
  const right = rightRecords.flatMap((record) => {
    const point = extractPoint(record, rightSource);
    return point ? [{ record, point }] : [];
  });
  const matches: Rec[] = [];
  for (const leftRecord of leftRecords) {
    const leftPoint = extractPoint(leftRecord, leftSource);
    if (!leftPoint) continue;
    for (const candidate of right) {
      const distance = haversineKm(leftPoint, candidate.point);
      if (distance <= radiusKm) matches.push({ left: leftRecord, right: candidate.record, distance_km: Number(distance.toFixed(3)) });
      if (matches.length >= maxMatches) return matches;
    }
  }
  return matches;
}
