import { coverageSummary } from "./catalog.js";
import { SERVER_NAME, VERSION } from "./version.js";

const READ_TOOLS = [
  "uae_place_names",
  "uae_founder_pathway",
  "uae_startup_support",
  "uae_business_setup",
  "uae_golden_residency",
  "uae_education_ledger",
  "uae_health_indicators",
  "uae_products_list",
  "uae_sources_list", "uae_source_get", "uae_source_health", "uae_source_datasets",
  "uae_source_records", "uae_dataset_schema", "uae_search", "uae_source_geo",
  "uae_source_aggregate", "uae_market_snapshot", "uae_dashboard_summary", "uae_intelligence_recipe",
  "uae_spatial_join",
  "uae_indicator", "uae_entity_resolve", "uae_observatory", "uae_industry_atlas",
  "uae_tax_service_activity",
  "uae_tax_service_archive",
  "uae_trade_flow_radar",
  "uae_ajman_business_evidence",
  "uae_ajman_urban_evidence",
];

const WRITE_TOOLS = ["uae_source_add", "uae_source_add_metadata", "uae_dataset_snapshot:create"];

export function trustSummary(): {
  version: string;
  readTools: number;
  writeTools: number;
  totalTools: number;
} {
  const readTools = READ_TOOLS.length + 2;
  const writeTools = WRITE_TOOLS.length;
  return { version: VERSION, readTools, writeTools, totalTools: readTools + writeTools };
}

export function trustManifest(): Record<string, unknown> {
  return {
    schemaVersion: "1.0",
    operator: { name: "Ahmed Morsy", contact: "vacrom414@gmail.com" },
    server: { name: SERVER_NAME, version: VERSION, runtime: "bun", license: "MIT" },
    endpoints: { mcp: "/mcp", rest: "/api/v1", products: "/api/v1/products", placeNames: "/places", placeNamesApi: "/api/v1/places", founderPathway: "/founder-pathway", founderPathwayApi: "/api/v1/founder-pathway", startupSupport: "/startup-support", startupSupportApi: "/api/v1/startup-support", businessSetup: "/business-setup", businessSetupApi: "/api/v1/business-setup", goldenResidency: "/golden-residency", goldenResidencyApi: "/api/v1/golden-residency", educationLedger: "/education", educationLedgerApi: "/api/v1/education", healthIndicators: "/health-indicators", healthIndicatorsApi: "/api/v1/health-indicators", observatory: "/observatory", industryAtlas: "/industry-atlas", tradeFlowRadar: "/trade-flow", tradeFlowApi: "/api/v1/trade-flow", ajmanBusiness: "/ajman-business", ajmanBusinessApi: "/api/v1/ajman-business", ajmanUrban: "/ajman-urban", ajmanUrbanApi: "/api/v1/ajman-urban", taxServiceActivity: "/tax-services", taxServiceArchivePage: "/tax-services/archive", taxServiceArchive: "/api/v1/tax-services/archive", health: "/health", metrics: "/metrics" },
    tools: {
      read: [...READ_TOOLS, "uae_dataset_snapshot:list", "uae_dataset_snapshot:diff"],
      write: [...WRITE_TOOLS],
      writesEnabledByDefault: false,
    },
    safeguards: ["ssrf-protection", "pii-redaction", "bounded-fetches", "rate-limiting", "host-allowlist", "origin-allowlist"],
    dataPolicy: { provenanceRequired: true, fabricationAllowed: false, licenseVerification: "per-dataset when available" },
    coverage: coverageSummary(),
  };
}
