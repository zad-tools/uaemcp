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
  "uae_health_facilities_atlas",
  "uae_health_facilities_map",
  "uae_aeronautical_publications",
  "uae_evidence_dossier",
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
  "uae_ajman_parks_footfall",
  "uae_national_evidence_brief",
  "uae_connectivity_pulse",
  "uae_policy_evidence_watch",
];

const WRITE_TOOLS = ["uae_source_add", "uae_source_add_metadata", "uae_dataset_snapshot:create"];

export function trustSummary(): {
  version: string;
  readTools: number;
  writeTools: number;
  totalTools: number;
} {
  const readToolNames = [...READ_TOOLS, "uae_dataset_snapshot"];
  const writeToolNames = WRITE_TOOLS.map((name) => name.split(":", 1)[0]);
  const readTools = new Set(readToolNames).size;
  const writeTools = new Set(writeToolNames).size;
  const totalTools = new Set([...readToolNames, ...writeToolNames]).size;
  return { version: VERSION, readTools, writeTools, totalTools };
}

export function trustManifest(): Record<string, unknown> {
  return {
    schemaVersion: "1.0",
    operator: { name: "Ahmed Morsy", contact: "vacrom414@gmail.com" },
    server: { name: SERVER_NAME, version: VERSION, runtime: "bun", license: "MIT" },
    endpoints: { mcp: "/mcp", rest: "/api/v1", products: "/api/v1/products", connectivity: "/connectivity", connectivityApi: "/api/v1/connectivity", aeronauticalPublications: "/aeronautical-publications", aeronauticalPublicationsApi: "/api/v1/aeronautical-publications", policyWatch: "/policy-watch", policyWatchApi: "/api/v1/policy-watch", policyWatchCheckApi: "/api/v1/policy-watch/check", policyWatchOperations: "/api/v1/operations/policy-watch", evidenceStudio: "/evidence-studio", evidenceDossierApi: "/api/v1/evidence-dossier", nationalBrief: "/national-brief", nationalBriefApi: "/api/v1/national-brief", healthFacilities: "/health-facilities", healthFacilitiesApi: "/api/v1/health-facilities", healthFacilitiesMap: "/health-facilities-map", healthFacilitiesMapApi: "/api/v1/health-facilities-map", placeNames: "/places", placeNamesApi: "/api/v1/places", founderPathway: "/founder-pathway", founderPathwayApi: "/api/v1/founder-pathway", startupSupport: "/startup-support", startupSupportApi: "/api/v1/startup-support", businessSetup: "/business-setup", businessSetupApi: "/api/v1/business-setup", goldenResidency: "/golden-residency", goldenResidencyApi: "/api/v1/golden-residency", educationLedger: "/education", educationLedgerApi: "/api/v1/education", healthIndicators: "/health-indicators", healthIndicatorsApi: "/api/v1/health-indicators", observatory: "/observatory", industryAtlas: "/industry-atlas", tradeFlowRadar: "/trade-flow", tradeFlowApi: "/api/v1/trade-flow", ajmanBusiness: "/ajman-business", ajmanBusinessApi: "/api/v1/ajman-business", ajmanUrban: "/ajman-urban", ajmanUrbanApi: "/api/v1/ajman-urban", ajmanParks: "/ajman-parks", ajmanParksApi: "/api/v1/ajman-parks", taxServiceActivity: "/tax-services", taxServiceArchivePage: "/tax-services/archive", taxServiceArchive: "/api/v1/tax-services/archive", health: "/health", metrics: "/metrics" },
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
