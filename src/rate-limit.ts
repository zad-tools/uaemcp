import { SETTINGS } from "./config.js";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function clientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  return request.headers.get("cf-connecting-ip")
    || forwarded?.at(-1)
    || "direct";
}

export function checkRateLimit(request: Request, now = Date.now()): { allowed: boolean; retryAfter: number } {
  const limit = SETTINGS.rateLimitPerMinute;
  if (limit <= 0) return { allowed: true, retryAfter: 0 };
  const key = clientId(request);
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 60_000 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (buckets.size > 10_000) {
    for (const [id, item] of buckets) if (now >= item.resetAt) buckets.delete(id);
  }
  return { allowed: bucket.count <= limit, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
}

export function clearRateLimits(): void {
  buckets.clear();
}
