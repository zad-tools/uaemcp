/** Runtime configuration, loaded once from the environment. */

function num(name: string, def: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && process.env[name] ? v : def;
}

function bool(name: string, def: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return def;
  return ["1", "true", "yes", "on"].includes(v.trim().toLowerCase());
}

function positiveInt(name: string, def: number, max: number): number {
  const value = num(name, def);
  return Number.isInteger(value) && value > 0 ? Math.min(value, max) : def;
}

function list(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface Settings {
  writeToken: string | null;
  host: string;
  port: number;
  httpTimeoutMs: number;
  healthTimeoutMs: number;
  cacheTtlMs: number;
  staleWhileRevalidateMs: number;
  toolProfile: "full" | "core" | "research" | "geo";
  maxResponseBytes: number;
  allowPrivateHosts: boolean;
  userAgent: string;
  allowedHosts: string[];
  allowedOrigins: string[];
  rateLimitPerMinute: number;
  databasePath: string;
  snapshotIntervalMinutes: number;
  snapshotTargets: string[];
  snapshotLimit: number;
  snapshotRetention: number;
  healthRetention: number;
  healthScanIntervalMinutes: number;
  embeddingEndpoint: string | null;
  embeddingModel: string;
  embeddingApiKey: string | null;
  policyWatchPath: string;
  policyWatchIntervalMinutes: number;
  policyWatchRetention: number;
}

export const SETTINGS: Settings = {
  writeToken: process.env.UAEMCP_WRITE_TOKEN || null,
  host: process.env.UAEMCP_HOST ?? "127.0.0.1",
  port: num("UAEMCP_PORT", 8080),
  httpTimeoutMs: num("UAEMCP_HTTP_TIMEOUT", 8) * 1000,
  healthTimeoutMs: num("UAEMCP_HEALTH_TIMEOUT", 5) * 1000,
  cacheTtlMs: num("UAEMCP_CACHE_TTL", 300) * 1000,
  staleWhileRevalidateMs: num("UAEMCP_STALE_WHILE_REVALIDATE", 1800) * 1000,
  toolProfile: (["core", "research", "geo"].includes(process.env.UAEMCP_TOOL_PROFILE ?? "")
    ? process.env.UAEMCP_TOOL_PROFILE
    : "full") as Settings["toolProfile"],
  maxResponseBytes: num("UAEMCP_MAX_RESPONSE_BYTES", 5 * 1024 * 1024),
  allowPrivateHosts: bool("UAEMCP_ALLOW_PRIVATE_HOSTS", false),
  userAgent:
    process.env.UAEMCP_USER_AGENT ??
    "Mozilla/5.0 (compatible; UAEMCP/0.1; +https://github.com/)",
  allowedHosts: list("UAEMCP_ALLOWED_HOSTS"),
  allowedOrigins: list("UAEMCP_ALLOWED_ORIGINS"),
  rateLimitPerMinute: num("UAEMCP_RATE_LIMIT_PER_MINUTE", 120),
  databasePath: process.env.UAEMCP_DATABASE_PATH ?? "data/uaemcp.sqlite",
  snapshotIntervalMinutes: num("UAEMCP_SNAPSHOT_INTERVAL_MINUTES", 0),
  snapshotTargets: list("UAEMCP_SNAPSHOT_TARGETS"),
  snapshotLimit: positiveInt("UAEMCP_SNAPSHOT_LIMIT", 100, 1000),
  snapshotRetention: positiveInt("UAEMCP_SNAPSHOT_RETENTION", 30, 10_000),
  healthRetention: positiveInt("UAEMCP_HEALTH_RETENTION", 10_000, 1_000_000),
  healthScanIntervalMinutes: num("UAEMCP_HEALTH_SCAN_INTERVAL_MINUTES", 0),
  embeddingEndpoint: process.env.UAEMCP_EMBEDDING_ENDPOINT || null,
  embeddingModel: process.env.UAEMCP_EMBEDDING_MODEL ?? "text-embedding-3-small",
  embeddingApiKey: process.env.UAEMCP_EMBEDDING_API_KEY || null,
  policyWatchPath: process.env.UAEMCP_POLICY_WATCH_PATH ?? "data/policy-watch.json",
  policyWatchIntervalMinutes: num("UAEMCP_POLICY_WATCH_INTERVAL_MINUTES", 0),
  policyWatchRetention: positiveInt("UAEMCP_POLICY_WATCH_RETENTION", 30, 1_000),
};

export const writesEnabled = (): boolean => Boolean(SETTINGS.writeToken);
