export interface OpenEmiratesApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface OpenEmiratesEnvelope<T> {
  ok: boolean;
  data: T;
  error: OpenEmiratesApiError | null;
  meta: Record<string, unknown>;
}

export interface OpenEmiratesPageOptions {
  limit?: number;
  offset?: number;
}

export interface OpenEmiratesRecordsOptions extends OpenEmiratesPageOptions {
  dataset?: string;
  query?: string;
}

export type OpenEmiratesToolKind = "read" | "write" | "mixed";
export type OpenEmiratesJsonSchema = Record<string, unknown>;

export interface OpenEmiratesToolCatalogEntry {
  name: string;
  title: string;
  kind: OpenEmiratesToolKind;
  description: string;
  inputSchema: OpenEmiratesJsonSchema;
  outputSchema: OpenEmiratesJsonSchema;
  exampleArguments: Record<string, unknown>;
  limitations: string[];
  since: string | null;
  stability: "stable" | "experimental";
  deprecated: boolean;
  idempotent: boolean;
  sideEffects: boolean;
  authScopes: string[];
  requiresAuth: boolean;
  browserPlayable: boolean;
  execution: { timeoutMs: number; maxResultBytes: number };
}

export interface OpenEmiratesToolCatalog {
  schemaVersion: string;
  serverVersion: string;
  generatedFrom: string;
  summary: { total: number; read: number; write: number; mixed: number };
  tools: OpenEmiratesToolCatalogEntry[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseEnvelope<T>(value: unknown): OpenEmiratesEnvelope<T> {
  if (!isRecord(value) || typeof value.ok !== "boolean" || !("data" in value) || !("error" in value) || !isRecord(value.meta)) {
    throw new TypeError("Invalid Open Emirates response envelope");
  }
  if (value.error !== null && (!isRecord(value.error) || typeof value.error.code !== "string" || typeof value.error.message !== "string")) {
    throw new TypeError("Invalid Open Emirates response envelope");
  }
  return value as unknown as OpenEmiratesEnvelope<T>;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseToolCatalogEntry(value: unknown): OpenEmiratesToolCatalogEntry {
  if (
    !isRecord(value)
    || typeof value.name !== "string"
    || typeof value.title !== "string"
    || !["read", "write", "mixed"].includes(String(value.kind))
    || typeof value.description !== "string"
    || !isRecord(value.inputSchema)
    || !isRecord(value.outputSchema)
    || !isRecord(value.exampleArguments)
    || !isStringArray(value.limitations)
    || !(value.since === null || typeof value.since === "string")
    || !["stable", "experimental"].includes(String(value.stability))
    || typeof value.deprecated !== "boolean"
    || typeof value.idempotent !== "boolean"
    || typeof value.sideEffects !== "boolean"
    || !isStringArray(value.authScopes)
    || typeof value.requiresAuth !== "boolean"
    || typeof value.browserPlayable !== "boolean"
    || !isRecord(value.execution)
    || typeof value.execution.timeoutMs !== "number"
    || typeof value.execution.maxResultBytes !== "number"
  ) {
    throw new TypeError("Invalid Open Emirates tool catalog entry");
  }
  return value as unknown as OpenEmiratesToolCatalogEntry;
}

export function parseToolCatalog(value: unknown): OpenEmiratesToolCatalog {
  if (!isRecord(value)) throw new TypeError("Invalid Open Emirates tool catalog");
  const summary = value.summary;
  if (
    typeof value.schemaVersion !== "string"
    || typeof value.serverVersion !== "string"
    || typeof value.generatedFrom !== "string"
    || !isRecord(summary)
    || !["total", "read", "write", "mixed"].every((key) => typeof summary[key] === "number")
    || !Array.isArray(value.tools)
  ) {
    throw new TypeError("Invalid Open Emirates tool catalog");
  }
  const tools = value.tools.map(parseToolCatalogEntry);
  if (summary.total !== tools.length) throw new TypeError("Invalid Open Emirates tool catalog");
  return { ...value, tools } as OpenEmiratesToolCatalog;
}
