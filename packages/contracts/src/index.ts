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
