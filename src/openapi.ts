import { VERSION } from "./version.js";

const envelope = (schema: Record<string, unknown>): Record<string, unknown> => ({
  type: "object", required: ["ok", "data", "error", "meta"],
  properties: { ok: { type: "boolean" }, data: schema, error: { anyOf: [{ type: "object" }, { type: "null" }] }, meta: { type: "object", additionalProperties: true } },
});

const parameter = (name: string, required = false, schema: Record<string, unknown> = { type: "string" }): Record<string, unknown> => ({ name, in: "query", required, schema });
const response = (schema: Record<string, unknown>): Record<string, unknown> => ({ description: "Successful response", content: { "application/json": { schema } } });

export function openApiDocument(origin = "http://localhost:8080"): Record<string, unknown> {
  const sourceId = { name: "sourceId", in: "path", required: true, schema: { type: "string" } };
  return {
    openapi: "3.1.0",
    info: { title: "Open Emirates Intelligence API", version: VERSION, description: "Source-cited official UAE open data. Unknown or unavailable data is never fabricated.", license: { name: "MIT" } },
    servers: [{ url: origin }],
    tags: [{ name: "Catalog" }, { name: "Data" }, { name: "Intelligence" }, { name: "Observatory" }, { name: "Maps" }],
    paths: {
      "/api/v1/coverage": { get: { operationId: "getCoverage", tags: ["Catalog"], responses: { "200": response(envelope({ $ref: "#/components/schemas/Coverage" })) } } },
      "/api/v1/industry-atlas": { get: { operationId: "getIndustryAtlas", tags: ["Intelligence"], parameters: [parameter("emirate"), parameter("q"), parameter("limit", false, { type: "integer", minimum: 1, maximum: 1000 })], responses: { "200": response(envelope({ type: "object", additionalProperties: true })) } } },
      "/api/v1/industry-atlas/change": { get: { operationId: "getIndustryChange", tags: ["Intelligence"], responses: { "200": response(envelope({ type: "object", additionalProperties: true })) } } },
      "/api/v1/trade-flow": { get: { operationId: "getTradeFlowRadar", tags: ["Intelligence"], parameters: [parameter("limit", false, { type: "integer", minimum: 1, maximum: 1000 })], responses: { "200": response(envelope({ type: "object", additionalProperties: true })) } } },
      "/api/v1/tax-services": { get: { operationId: "getTaxServiceActivity2025", tags: ["Intelligence"], responses: { "200": response(envelope({ type: "object", additionalProperties: true })) } } },
      "/api/v1/tax-services/archive": { get: { operationId: "getTaxServiceArchive", tags: ["Intelligence"], responses: { "200": response(envelope({ type: "object", additionalProperties: true })) } } },
      "/api/v1/sources": { get: { operationId: "listSources", tags: ["Catalog"], responses: { "200": response(envelope({ type: "array", items: { $ref: "#/components/schemas/Source" } })) } } },
      "/api/v1/search": { get: { operationId: "search", tags: ["Catalog"], parameters: [parameter("q", true), parameter("limit", false, { type: "integer", minimum: 1, maximum: 100 }), parameter("deep", false, { type: "boolean" })], responses: { "200": response(envelope({ type: "object", additionalProperties: true })) } } },
      "/api/v1/sources/{sourceId}/records": { get: { operationId: "getRecords", tags: ["Data"], parameters: [sourceId, parameter("dataset"), parameter("query"), parameter("limit", false, { type: "integer", minimum: 1, maximum: 1000 }), parameter("offset", false, { type: "integer", minimum: 0 })], responses: { "200": response(envelope({ type: "array", items: { type: "object", additionalProperties: true } })) } } },
      "/api/v1/sources/{sourceId}/schema": { get: { operationId: "getDatasetSchema", tags: ["Data"], parameters: [sourceId, parameter("dataset"), parameter("sample_size", false, { type: "integer", minimum: 1, maximum: 100 })], responses: { "200": response(envelope({ type: "object", additionalProperties: true })) } } },
      "/api/v1/intelligence/recipes": { get: { operationId: "listRecipes", tags: ["Intelligence"], responses: { "200": response(envelope({ type: "array", items: { type: "object", additionalProperties: true } })) } } },
      "/api/v1/intelligence/indicators": { get: { operationId: "listIndicators", tags: ["Intelligence"], responses: { "200": response(envelope({ type: "array", items: { type: "object", additionalProperties: true } })) } } },
      "/api/v1/intelligence/indicators/{indicatorId}": { get: { operationId: "getIndicator", tags: ["Intelligence"], parameters: [{ name: "indicatorId", in: "path", required: true, schema: { type: "string" } }, parameter("source_id"), parameter("dataset")], responses: { "200": response(envelope({ type: "object", additionalProperties: true })) } } },
      "/api/v1/observatory": { get: { operationId: "getObservatoryReport", tags: ["Observatory"], responses: { "200": response(envelope({ type: "object", additionalProperties: true })) } } },
      "/api/v1/observatory/incidents": { get: { operationId: "listObservatoryIncidents", tags: ["Observatory"], parameters: [parameter("source_id"), parameter("limit", false, { type: "integer", minimum: 1, maximum: 500 })], responses: { "200": response(envelope({ type: "array", items: { type: "object", additionalProperties: true } })) } } },
      "/api/v1/observatory/sources/{sourceId}": { get: { operationId: "getObservatorySource", tags: ["Observatory"], parameters: [sourceId, parameter("limit", false, { type: "integer", minimum: 1, maximum: 500 })], responses: { "200": response(envelope({ type: "object", additionalProperties: true })) } } },
      "/api/v1/sources/{sourceId}/tilejson": { get: { operationId: "getTileJson", tags: ["Maps"], parameters: [sourceId, parameter("dataset")], responses: { "200": response({ type: "object", additionalProperties: true }) } } },
      "/api/v1/spatial/join": { get: { operationId: "spatialJoin", tags: ["Maps"], parameters: [parameter("left_source", true), parameter("right_source", true), parameter("radius_km", false, { type: "number", exclusiveMinimum: 0, maximum: 500 })], responses: { "200": response(envelope({ type: "array", items: { type: "object", additionalProperties: true } })) } } },
      "/api/v1/entities/resolve": { get: { operationId: "resolveEntities", tags: ["Intelligence"], parameters: [parameter("left_source", true), parameter("right_source", true), parameter("left_fields", true), parameter("right_fields", true)], responses: { "200": response(envelope({ type: "object", additionalProperties: true })) } } },
    },
    components: { schemas: {
      Coverage: { type: "object", required: ["officialPortalsIndexed", "liveRecordConnectors"], properties: { officialPortalsIndexed: { type: "integer" }, liveRecordConnectors: { type: "integer" }, blockedConnectors: { type: "integer" }, keyRequiredPortals: { type: "integer" }, metadataOnlyPortals: { type: "integer" }, queryableDatasetsKnownMinimum: { type: "integer" } } },
      Source: { type: "object", required: ["id", "name_en", "name_ar", "kind", "access_status"], properties: { id: { type: "string" }, name_en: { type: "string" }, name_ar: { type: "string" }, owner: { type: "string" }, kind: { type: "string" }, access_status: { enum: ["live", "blocked", "key_required", "metadata_only"] }, base_url: { type: "string", format: "uri" } } },
    } },
  };
}
