import { GeoJSONVT } from "@maplibre/geojson-vt";
import { fromGeojsonVt } from "@maplibre/vt-pbf";
import type { FeatureCollection, GeoJsonProperties, Geometry } from "geojson";

type Rec = Record<string, unknown>;

function safeLayerName(value: string): string {
  const name = value.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return name.slice(0, 64) || "uae_data";
}

function sanitizeProperties(properties: GeoJsonProperties): GeoJsonProperties {
  if (!properties) return {};
  return Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, value !== null && typeof value === "object" ? JSON.stringify(value) : value])) as GeoJsonProperties;
}

export function encodeVectorTile(collection: Rec, z: number, x: number, y: number, layer = "uae_data"): Uint8Array {
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 22 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) throw new Error("tile coordinates must be valid z/x/y integers with z between 0 and 22");
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) throw new Error("vector tile input must be a GeoJSON FeatureCollection");
  const features = (collection.features as Rec[]).map((feature) => ({ ...feature, properties: sanitizeProperties((feature.properties ?? {}) as GeoJsonProperties) }));
  const index = new GeoJSONVT({ type: "FeatureCollection", features } as FeatureCollection<Geometry, GeoJsonProperties>, { maxZoom: 22, extent: 4096, buffer: 64 });
  const tile = index.getTile(z, x, y);
  return tile ? fromGeojsonVt({ [safeLayerName(layer)]: tile }, { version: 2, extent: 4096 }) : new Uint8Array();
}
