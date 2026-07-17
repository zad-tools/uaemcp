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
  maxResponseBytes: number;
  allowPrivateHosts: boolean;
  userAgent: string;
  allowedHosts: string[];
  allowedOrigins: string[];
}

export const SETTINGS: Settings = {
  writeToken: process.env.UAEMCP_WRITE_TOKEN || null,
  host: process.env.UAEMCP_HOST ?? "127.0.0.1",
  port: num("UAEMCP_PORT", 8080),
  httpTimeoutMs: num("UAEMCP_HTTP_TIMEOUT", 8) * 1000,
  healthTimeoutMs: num("UAEMCP_HEALTH_TIMEOUT", 5) * 1000,
  cacheTtlMs: num("UAEMCP_CACHE_TTL", 300) * 1000,
  maxResponseBytes: num("UAEMCP_MAX_RESPONSE_BYTES", 5 * 1024 * 1024),
  allowPrivateHosts: bool("UAEMCP_ALLOW_PRIVATE_HOSTS", false),
  userAgent:
    process.env.UAEMCP_USER_AGENT ??
    "Mozilla/5.0 (compatible; UAEMCP/0.1; +https://github.com/)",
  allowedHosts: list("UAEMCP_ALLOWED_HOSTS"),
  allowedOrigins: list("UAEMCP_ALLOWED_ORIGINS"),
};

export const writesEnabled = (): boolean => Boolean(SETTINGS.writeToken);
