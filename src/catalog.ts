import type { Source } from "./sources.js";
import { REGISTRY } from "./sources.js";

export interface Capabilities {
  metadata: true;
  datasets: boolean;
  records: boolean;
  search: boolean;
  geo: boolean;
  aggregation: boolean;
  schema: boolean;
  history: false;
  realtime: false;
  export: string[];
  queryLanguage: "text" | "ckan" | "opendatasoft" | "arcgis" | null;
}

export function capabilitiesFor(source: Source): Capabilities {
  const records = source.access_status === "live" && source.kind !== "metadata";
  const datasets = ["ckan", "ods", "arcgis"].includes(source.kind);
  const queryLanguage = source.kind === "http_json" ? "text" : source.kind === "metadata" ? null : source.kind === "ods" ? "opendatasoft" : source.kind;
  return {
    metadata: true,
    datasets,
    records,
    search: records || datasets,
    geo: records,
    aggregation: records,
    schema: records,
    history: false,
    realtime: false,
    export: records ? ["json", "csv", "geojson", "xlsx"] : [],
    queryLanguage,
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

export function coverageSummary(): Record<string, unknown> {
  const sources = REGISTRY.list();
  const count = (status: Source["access_status"]) => sources.filter((source) => source.access_status === status).length;
  return {
    officialPortalsIndexed: sources.length,
    liveRecordConnectors: count("live"),
    blockedConnectors: count("blocked"),
    keyRequiredPortals: count("key_required"),
    metadataOnlyPortals: count("metadata_only"),
    queryableDatasetsKnownMinimum: 212,
    note: "Queryable dataset counts are conservative and never inferred from metadata-only portals.",
  };
}
