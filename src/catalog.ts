import type { Source } from "./sources.js";
import { REGISTRY } from "./sources.js";
import type { DatasetRef } from "./connectors.js";
import { connectorCapabilities } from "./connectors.js";

export interface Capabilities {
  metadata: true;
  datasets: boolean;
  records: boolean;
  search: boolean;
  geo: boolean;
  aggregation: boolean;
  schema: boolean;
  history: boolean;
  realtime: boolean;
  export: string[];
  queryLanguage: string | null;
}

export function capabilitiesFor(source: Source): Capabilities {
  const records = source.access_status === "live" && source.kind !== "metadata";
  const datasets = ["ckan", "ods", "arcgis"].includes(source.kind);
  const queryLanguage = source.kind === "http_json" ? "text" : source.kind === "metadata" ? null : source.kind === "ods" ? "opendatasoft" : source.kind;
  const plugin = connectorCapabilities(source.kind);
  return {
    metadata: true,
    datasets,
    records: records && (plugin?.records ?? true),
    search: records && (plugin?.search ?? (records || datasets)),
    geo: records && (plugin?.geo ?? records),
    aggregation: records && (plugin?.aggregation ?? records),
    schema: records && (plugin?.schema ?? records),
    history: records && (plugin?.history ?? records),
    realtime: records && (plugin?.realtime ?? false),
    export: records ? (plugin?.export ?? ["json", "csv", "geojson", "xlsx"]) : [],
    queryLanguage: (plugin?.queryLanguage ?? queryLanguage) as Capabilities["queryLanguage"],
  };
}

export function portalModel(source: Source): Record<string, unknown> {
  return {
    id: source.id,
    type: "portal",
    organization: { id: source.owner.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), name: source.owner },
    title: { en: source.name_en, ar: source.name_ar },
    category: source.category,
    connector: source.kind,
    accessStatus: source.access_status,
    capabilities: capabilitiesFor(source),
    license: { statement: source.license, status: "unverified", url: source.docs_url || source.base_url },
    links: { portal: source.base_url, documentation: source.docs_url || null, apiDocumentation: source.api_docs || null },
  };
}

export function datasetModel(dataset: DatasetRef, source: Source, now = Date.now()): Record<string, unknown> {
  const modifiedAt = dataset.modified && Number.isFinite(Date.parse(dataset.modified)) ? new Date(dataset.modified).toISOString() : null;
  const freshnessDays = modifiedAt ? Math.max(0, Math.floor((now - Date.parse(modifiedAt)) / 86_400_000)) : null;
  const capabilities = capabilitiesFor(source);
  return {
    ...dataset,
    type: "dataset",
    portalId: source.id,
    capabilities: { ...capabilities, geo: capabilities.geo && dataset.has_geo },
    license: { statement: source.license, status: "unverified", url: source.docs_url || source.base_url },
    freshness: { modifiedAt, ageDays: freshnessDays, status: freshnessDays === null ? "unknown" : freshnessDays > 365 ? "stale" : "current" },
  };
}

export function coverageSummary(): Record<string, unknown> {
  const sources = REGISTRY.list();
  const count = (status: Source["access_status"]) => sources.filter((source) => source.access_status === status).length;
  return {
    officialPortalsIndexed: sources.length,
    liveRecordConnectors: count("live"),
    blockedConnectors: count("blocked"),
    keyRequiredPortals: count("key_required"),
    metadataOnlyPortals: count("metadata_only"),
    queryableDatasetsKnownMinimum: 213,
    note: "Queryable dataset counts are conservative and never inferred from metadata-only portals.",
  };
}
