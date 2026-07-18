import {
  parseEnvelope,
  parseToolCatalog,
  type OpenEmiratesApiError,
  type OpenEmiratesEnvelope,
  type OpenEmiratesRecordsOptions,
  type OpenEmiratesToolCatalog,
  type OpenEmiratesToolCatalogEntry,
} from "@open-emirates/contracts";
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import type { OpenEmiratesToolArguments, OpenEmiratesToolData, OpenEmiratesToolName } from "./tool-types.generated.js";

export type {
  OpenEmiratesApiError,
  OpenEmiratesEnvelope,
  OpenEmiratesRecordsOptions,
  OpenEmiratesToolCatalog,
  OpenEmiratesToolCatalogEntry,
} from "@open-emirates/contracts";
export type { OpenEmiratesToolArguments, OpenEmiratesToolData, OpenEmiratesToolName } from "./tool-types.generated.js";

export type OpenEmiratesFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface OpenEmiratesClientOptions {
  baseUrl?: string;
  apiKey?: string;
  fetch?: OpenEmiratesFetch;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  toolCatalogTtlMs?: number;
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

export class OpenEmiratesToolValidationError extends TypeError {
  constructor(
    readonly toolName: string,
    readonly phase: "input" | "output",
    readonly issues: string[],
  ) {
    super(`${toolName} ${phase} validation failed: ${issues.join("; ")}`);
    this.name = "OpenEmiratesToolValidationError";
  }
}

export interface OpenEmiratesToolCatalogOptions {
  refresh?: boolean;
}

export interface OpenEmiratesToolsClient {
  list(options?: OpenEmiratesToolCatalogOptions): Promise<OpenEmiratesToolCatalog>;
  get(name: string, options?: OpenEmiratesToolCatalogOptions): Promise<OpenEmiratesToolCatalogEntry>;
  call<Name extends OpenEmiratesToolName>(name: Name, args: OpenEmiratesToolArguments[Name]): Promise<OpenEmiratesEnvelope<OpenEmiratesToolData[Name]>>;
  call<T = unknown>(name: string, args: Record<string, unknown>): Promise<OpenEmiratesEnvelope<T>>;
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
const retryableStatus = (status: number) => status === 429 || status >= 500;
const ajv = new Ajv({ allErrors: true, strict: false });
ajv.addFormat("date", {
  type: "string",
  validate: (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  },
});

function validationIssues(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => `${error.instancePath || "arguments"} ${error.message ?? "is invalid"}`.trim());
}

export class OpenEmiratesClient {
  readonly baseUrl: string;
  readonly apiKey?: string;
  private readonly fetcher: OpenEmiratesFetch;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly toolCatalogTtlMs: number;
  private toolCatalogCache?: { key: string; expiresAt: number; value: OpenEmiratesToolCatalog };
  private readonly toolValidators = new Map<string, { input: ValidateFunction; output: ValidateFunction }>();
  readonly tools: OpenEmiratesToolsClient;

  constructor(options: OpenEmiratesClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://uaemcp.zad.tools").replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.retries = options.retries ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 250;
    this.toolCatalogTtlMs = options.toolCatalogTtlMs ?? 300_000;
    if (this.timeoutMs < 1 || this.retries < 0 || this.retryDelayMs < 0 || this.toolCatalogTtlMs < 0) throw new RangeError("Invalid Open Emirates client options");
    this.tools = {
      list: (catalogOptions) => this.listTools(catalogOptions),
      get: (name, catalogOptions) => this.getTool(name, catalogOptions),
      call: ((name: string, args: Record<string, unknown>) => this.callTool(name, args)) as OpenEmiratesToolsClient["call"],
    };
  }

  private query(path: string, values: object): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, String(value));
    const suffix = params.toString();
    return suffix ? `${path}?${suffix}` : path;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<OpenEmiratesEnvelope<T>> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const headers = new Headers(init.headers);
        headers.set("accept", "application/json");
        if (this.apiKey) headers.set("x-api-key", this.apiKey);
        const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers, signal: controller.signal });
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

  private async listTools(options: OpenEmiratesToolCatalogOptions = {}): Promise<OpenEmiratesToolCatalog> {
    if (!options.refresh && this.toolCatalogCache && this.toolCatalogCache.expiresAt > Date.now()) return this.toolCatalogCache.value;
    const response = await this.request<unknown>("/api/v1/tools");
    const catalog = parseToolCatalog(response.data);
    const key = `${catalog.schemaVersion}:${catalog.serverVersion}`;
    this.toolCatalogCache = { key, expiresAt: Date.now() + this.toolCatalogTtlMs, value: catalog };
    return catalog;
  }

  private async getTool(name: string, options: OpenEmiratesToolCatalogOptions = {}): Promise<OpenEmiratesToolCatalogEntry> {
    if (!/^uae_[a-z0-9_]+$/.test(name)) throw new TypeError("Invalid Open Emirates tool name");
    const catalog = await this.listTools(options);
    const tool = catalog.tools.find((entry) => entry.name === name);
    if (!tool) throw new OpenEmiratesClientError(404, { code: "not_found", message: `Unknown MCP tool: ${name}` });
    return tool;
  }

  private validatorsFor(tool: OpenEmiratesToolCatalogEntry): { input: ValidateFunction; output: ValidateFunction } {
    const catalogKey = this.toolCatalogCache?.key ?? "uncached";
    const key = `${catalogKey}:${tool.name}`;
    const cached = this.toolValidators.get(key);
    if (cached) return cached;
    const validators = { input: ajv.compile(tool.inputSchema), output: ajv.compile(tool.outputSchema) };
    this.toolValidators.set(key, validators);
    return validators;
  }

  private async callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<OpenEmiratesEnvelope<T>> {
    if (!args || typeof args !== "object" || Array.isArray(args)) throw new OpenEmiratesToolValidationError(name, "input", ["arguments must be an object"]);
    const tool = await this.getTool(name);
    if (!tool.browserPlayable) throw new OpenEmiratesClientError(403, { code: "forbidden", message: `${name} is not available through the public SDK tool bridge` });
    const validators = this.validatorsFor(tool);
    if (!validators.input(args)) throw new OpenEmiratesToolValidationError(name, "input", validationIssues(validators.input.errors));
    const result = await this.request<T>(`/api/v1/tools/${encodeURIComponent(name)}/call`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!validators.output(result)) throw new OpenEmiratesToolValidationError(name, "output", validationIssues(validators.output.errors));
    return result;
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
