import { coverageSummary } from "./catalog.js";
import { SERVER_NAME, VERSION } from "./version.js";

const READ_TOOLS = [
  "uae_sources_list", "uae_source_get", "uae_source_health", "uae_source_datasets",
  "uae_source_records", "uae_dataset_schema", "uae_search", "uae_source_geo",
  "uae_source_aggregate", "uae_market_snapshot", "uae_dashboard_summary", "uae_intelligence_recipe",
  "uae_spatial_join",
  "uae_indicator", "uae_entity_resolve", "uae_observatory", "uae_industry_atlas",
  "uae_tax_service_activity",
  "uae_tax_service_archive",
  "uae_trade_flow_radar",
];

export function trustManifest(): Record<string, unknown> {
  return {
    schemaVersion: "1.0",
    operator: { name: "Ahmed Morsy", contact: "vacrom414@gmail.com" },
    server: { name: SERVER_NAME, version: VERSION, runtime: "bun", license: "MIT" },
    endpoints: { mcp: "/mcp", rest: "/api/v1", observatory: "/observatory", industryAtlas: "/industry-atlas", tradeFlowRadar: "/trade-flow", tradeFlowApi: "/api/v1/trade-flow", taxServiceActivity: "/tax-services", taxServiceArchivePage: "/tax-services/archive", taxServiceArchive: "/api/v1/tax-services/archive", health: "/health", metrics: "/metrics" },
    tools: {
      read: [...READ_TOOLS, "uae_dataset_snapshot:list", "uae_dataset_snapshot:diff"],
      write: ["uae_source_add", "uae_source_add_metadata", "uae_dataset_snapshot:create"],
      writesEnabledByDefault: false,
    },
    safeguards: ["ssrf-protection", "pii-redaction", "bounded-fetches", "rate-limiting", "host-allowlist", "origin-allowlist"],
    dataPolicy: { provenanceRequired: true, fabricationAllowed: false, licenseVerification: "per-dataset when available" },
    coverage: coverageSummary(),
  };
}
