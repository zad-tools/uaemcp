/**
 * SSRF-guarded fetch.
 *
 * Every outbound request goes through the SSRF guard and carries a browser-like
 * User-Agent — several UAE government portals sit behind bot mitigation that
 * hangs unadorned clients until timeout but answers browser-like requests fast.
 */

import { SETTINGS } from "./config.js";
import { SourceUnavailable } from "./errors.js";
import { validateUrl } from "./ssrf.js";

async function request(
  url: string,
  opts: { params?: Record<string, unknown>; timeoutMs?: number; method?: "GET" | "POST"; body?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  let full = url;
  if (opts.params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    }
    const sep = url.includes("?") ? "&" : "?";
    full = qs.toString() ? `${url}${sep}${qs}` : url;
  }
  const controller = new AbortController();
  const timeout = opts.timeoutMs ?? SETTINGS.httpTimeoutMs;
  const timer = setTimeout(() => controller.abort(), timeout);
  let resp: Response;
  try {
    let current = full;
    let method: "GET" | "POST" = opts.method ?? "GET";
    let body = opts.body;
    for (let redirects = 0; ; redirects += 1) {
      await validateUrl(current, { allowPrivate: SETTINGS.allowPrivateHosts });
      resp = await fetch(current, {
        method, body, redirect: "manual", signal: controller.signal,
        headers: {
          "User-Agent": SETTINGS.userAgent,
          Accept: "application/json, text/html;q=0.9, */*;q=0.8",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...opts.headers,
        },
      });
      if (resp.status < 300 || resp.status >= 400) break;
      if (redirects >= 5) throw new SourceUnavailable(`source exceeded redirect limit: ${full}`);
      const location = resp.headers.get("location");
      if (!location) throw new SourceUnavailable(`source returned redirect without location: ${current}`);
      const next = new URL(location, current);
      if (new URL(current).protocol === "https:" && next.protocol !== "https:") {
        throw new SourceUnavailable(`source attempted an insecure redirect: ${current}`);
      }
      current = next.toString();
      if (resp.status === 303) { method = "GET"; body = undefined; }
    }
  } catch (err) {
    if (err instanceof SourceUnavailable) throw err;
    const reason = err instanceof Error && err.name === "AbortError" ? "timeout" : "transport error";
    throw new SourceUnavailable(`${reason} contacting source: ${full}`);
  } finally {
    clearTimeout(timer);
  }

  const clen = resp.headers.get("content-length");
  if (clen && Number(clen) > SETTINGS.maxResponseBytes) {
    throw new SourceUnavailable(`source response too large: ${full}`);
  }
  if (resp.status >= 400) {
    throw new SourceUnavailable(`source returned HTTP ${resp.status}: ${full}`);
  }
  return resp;
}

export async function getJson(
  url: string,
  params?: Record<string, unknown>,
  timeoutMs?: number,
): Promise<unknown> {
  const resp = await request(url, { params, timeoutMs });
  const text = await resp.text();
  if (text.length > SETTINGS.maxResponseBytes) {
    throw new SourceUnavailable(`source response too large: ${url}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new SourceUnavailable(`source did not return valid JSON: ${url}`);
  }
}

export async function postJson(url: string, payload: unknown, timeoutMs?: number, headers?: Record<string, string>): Promise<unknown> {
  const body = JSON.stringify(payload);
  if (body.length > SETTINGS.maxResponseBytes) throw new SourceUnavailable(`request body too large: ${url}`);
  const resp = await request(url, { method: "POST", body, timeoutMs, headers });
  const text = await resp.text();
  if (text.length > SETTINGS.maxResponseBytes) throw new SourceUnavailable(`source response too large: ${url}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new SourceUnavailable(`source did not return valid JSON: ${url}`);
  }
}

export async function getText(url: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<string> {
  const resp = await request(url, { params, timeoutMs });
  const text = await resp.text();
  if (text.length > SETTINGS.maxResponseBytes) throw new SourceUnavailable(`source response too large: ${url}`);
  return text;
}

export async function getBytes(url: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<Uint8Array> {
  const resp = await request(url, { params, timeoutMs });
  const bytes = new Uint8Array(await resp.arrayBuffer());
  if (bytes.byteLength > SETTINGS.maxResponseBytes) throw new SourceUnavailable(`source response too large: ${url}`);
  return bytes;
}

export async function probe(url: string, timeoutMs?: number): Promise<void> {
  // A probe checks reachability only and never reads the body, so a document
  // larger than the response cap (e.g. an official PDF) is proof the source is
  // up — not a failure. Only status/transport errors should fail a probe.
  try {
    await request(url, { timeoutMs });
  } catch (err) {
    if (err instanceof SourceUnavailable && err.message.startsWith("source response too large")) return;
    throw err;
  }
}
