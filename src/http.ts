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
  opts: { params?: Record<string, unknown>; timeoutMs?: number } = {},
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
  await validateUrl(full, { allowPrivate: SETTINGS.allowPrivateHosts });

  const controller = new AbortController();
  const timeout = opts.timeoutMs ?? SETTINGS.httpTimeoutMs;
  const timer = setTimeout(() => controller.abort(), timeout);
  let resp: Response;
  try {
    resp = await fetch(full, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": SETTINGS.userAgent,
        Accept: "application/json, text/html;q=0.9, */*;q=0.8",
      },
    });
  } catch (err) {
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

export async function probe(url: string, timeoutMs?: number): Promise<void> {
  await request(url, { timeoutMs });
}
