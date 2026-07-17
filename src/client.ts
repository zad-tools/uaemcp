export interface ApiError { code: string; message: string }
export interface Envelope<T> { ok: boolean; data: T | null; error: ApiError | null; meta: Record<string, unknown> }
export interface ClientOptions { baseUrl?: string; apiKey?: string; fetch?: typeof globalThis.fetch }
export interface RecordsOptions { dataset?: string; query?: string; limit?: number; offset?: number }

export class UaemcpClientError extends Error {
  constructor(readonly status: number, readonly detail: ApiError) { super(detail.message); }
}

export class UaemcpClient {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly fetcher: typeof globalThis.fetch;

  constructor(options: ClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://uaemcp.zad.tools").replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetcher = options.fetch ?? globalThis.fetch;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
    const headers = new Headers(init.headers);
    if (this.apiKey) headers.set("x-api-key", this.apiKey);
    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers });
    const payload = await response.json() as Envelope<T>;
    if (!response.ok || !payload.ok) throw new UaemcpClientError(response.status, payload.error ?? { code: "http_error", message: `HTTP ${response.status}` });
    return payload;
  }

  private query(path: string, values: object): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) if (value !== undefined) params.set(key, String(value));
    const suffix = params.toString();
    return suffix ? `${path}?${suffix}` : path;
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
  records<T = Record<string, unknown>[]>(sourceId: string, options: RecordsOptions = {}) {
    return this.request<T>(this.query(`/api/v1/sources/${encodeURIComponent(sourceId)}/records`, options));
  }
  schema<T = Record<string, unknown>>(sourceId: string, options: Pick<RecordsOptions, "dataset" | "limit"> = {}) {
    return this.request<T>(this.query(`/api/v1/sources/${encodeURIComponent(sourceId)}/schema`, options));
  }
  recipe<T = Record<string, unknown>>(recipeId: string, options: Record<string, string | number | boolean | undefined> = {}) {
    return this.request<T>(this.query(`/api/v1/intelligence/recipes/${encodeURIComponent(recipeId)}`, options));
  }
  snapshots<T = Record<string, unknown>[]>(sourceId: string, options: { dataset?: string; limit?: number } = {}) {
    return this.request<T>(this.query(`/api/v1/sources/${encodeURIComponent(sourceId)}/snapshots`, options));
  }
}
