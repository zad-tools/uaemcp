import {
  parseEnvelope,
  type OpenEmiratesApiError,
  type OpenEmiratesEnvelope,
  type OpenEmiratesRecordsOptions,
} from "@open-emirates/contracts";

export type { OpenEmiratesApiError, OpenEmiratesEnvelope, OpenEmiratesRecordsOptions } from "@open-emirates/contracts";

export type OpenEmiratesFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface OpenEmiratesClientOptions {
  baseUrl?: string;
  apiKey?: string;
  fetch?: OpenEmiratesFetch;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export interface RecordPagesOptions extends Omit<OpenEmiratesRecordsOptions, "limit" | "offset"> {
  pageSize?: number;
  maxPages?: number;
}

export class OpenEmiratesClientError extends Error {
  constructor(readonly status: number, readonly detail: OpenEmiratesApiError) {
    super(detail.message);
    this.name = "OpenEmiratesClientError";
  }
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const retryableStatus = (status: number) => status === 429 || status >= 500;

export class OpenEmiratesClient {
  readonly baseUrl: string;
  readonly apiKey?: string;
  private readonly fetcher: OpenEmiratesFetch;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly retryDelayMs: number;

  constructor(options: OpenEmiratesClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://uaemcp.zad.tools").replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.retries = options.retries ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 250;
    if (this.timeoutMs < 1 || this.retries < 0 || this.retryDelayMs < 0) throw new RangeError("Invalid Open Emirates client options");
  }

  private query(path: string, values: object): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, String(value));
    const suffix = params.toString();
    return suffix ? `${path}?${suffix}` : path;
  }

  private async request<T>(path: string): Promise<OpenEmiratesEnvelope<T>> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const headers = new Headers({ accept: "application/json" });
        if (this.apiKey) headers.set("x-api-key", this.apiKey);
        const response = await this.fetcher(`${this.baseUrl}${path}`, { headers, signal: controller.signal });
        const payload = parseEnvelope<T>(await response.json());
        if (response.ok && payload.ok) return payload;
        const error = new OpenEmiratesClientError(response.status, payload.error ?? { code: "http_error", message: `HTTP ${response.status}` });
        if (!retryableStatus(response.status) || attempt === this.retries) throw error;
        lastError = error;
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter >= 0 ? Math.min(retryAfter * 1_000, 30_000) : this.retryDelayMs * 2 ** attempt;
        if (delay) await wait(delay);
      } catch (error) {
        if (error instanceof OpenEmiratesClientError || error instanceof TypeError && error.message.startsWith("Invalid Open Emirates")) throw error;
        lastError = error;
        if (attempt === this.retries) throw error;
        const delay = this.retryDelayMs * 2 ** attempt;
        if (delay) await wait(delay);
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError;
  }

  sources<T = Record<string, unknown>[]>() { return this.request<T>("/api/v1/sources"); }
  source<T = Record<string, unknown>>(sourceId: string) { return this.request<T>(`/api/v1/sources/${encodeURIComponent(sourceId)}`); }
  coverage<T = Record<string, unknown>>() { return this.request<T>("/api/v1/coverage"); }
  search<T = Record<string, unknown>>(query: string, options: { limit?: number; deep?: boolean } = {}) {
    return this.request<T>(this.query("/api/v1/search", { q: query, ...options }));
  }
  datasets<T = Record<string, unknown>[]>(sourceId: string, options: { query?: string; limit?: number; offset?: number } = {}) {
    return this.request<T>(this.query(`/api/v1/sources/${encodeURIComponent(sourceId)}/datasets`, options));
  }
  records<T = Record<string, unknown>[]>(sourceId: string, options: OpenEmiratesRecordsOptions = {}) {
    return this.request<T>(this.query(`/api/v1/sources/${encodeURIComponent(sourceId)}/records`, options));
  }
  schema<T = Record<string, unknown>>(sourceId: string, options: Pick<OpenEmiratesRecordsOptions, "dataset" | "limit"> = {}) {
    return this.request<T>(this.query(`/api/v1/sources/${encodeURIComponent(sourceId)}/schema`, options));
  }

  async *recordPages<T = Record<string, unknown>>(sourceId: string, options: RecordPagesOptions = {}): AsyncGenerator<OpenEmiratesEnvelope<T[]>> {
    const pageSize = options.pageSize ?? 100;
    const maxPages = options.maxPages ?? 10;
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1_000 || !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100) {
      throw new RangeError("pageSize must be 1-1000 and maxPages must be 1-100");
    }
    for (let page = 0; page < maxPages; page += 1) {
      const result = await this.records<T[]>(sourceId, { dataset: options.dataset, query: options.query, limit: pageSize, offset: page * pageSize });
      yield result;
      if (result.data.length < pageSize) return;
    }
  }
}
