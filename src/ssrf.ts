/**
 * SSRF guard.
 *
 * Any URL fetched server-side MUST pass `validateUrl` first. It blocks
 * non-http(s) schemes and any host that resolves to a private, loopback,
 * link-local, unique-local, carrier-grade-NAT, reserved, multicast, or
 * cloud-metadata address — so a caller cannot turn our fetcher into a probe of
 * internal services.
 */

import { promises as dns } from "node:dns";
import ipaddr from "ipaddr.js";
import { BlockedRequest } from "./errors.js";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

// ipaddr.js range() labels that must never be reachable from the server.
const BLOCKED_RANGES = new Set([
  "unspecified",
  "broadcast",
  "loopback",
  "linkLocal",
  "private",
  "uniqueLocal",
  "carrierGradeNat",
  "reserved",
  "multicast",
]);

const METADATA_IPS = new Set([
  "169.254.169.254", // AWS/GCP/Azure/OpenStack IMDS
  "100.100.100.200", // Alibaba Cloud metadata
  "fd00:ec2::254", // AWS IMDS over IPv6
]);

export function isBlockedIp(raw: string): boolean {
  let addr;
  try {
    addr = ipaddr.parse(raw);
  } catch {
    return true; // unparseable → refuse
  }
  // Unwrap IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) before classifying.
  if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
    addr = (addr as ipaddr.IPv6).toIPv4Address();
  }
  if (METADATA_IPS.has(addr.toNormalizedString()) || METADATA_IPS.has(raw)) {
    return true;
  }
  return BLOCKED_RANGES.has(addr.range());
}

async function resolveIps(host: string): Promise<string[]> {
  try {
    const records = await dns.lookup(host, { all: true });
    return records.map((r) => r.address);
  } catch {
    throw new BlockedRequest(`cannot resolve host: ${host}`);
  }
}

export async function validateUrl(
  url: string,
  opts: { allowPrivate?: boolean } = {},
): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BlockedRequest(`invalid URL: ${url}`);
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new BlockedRequest(`scheme not allowed: ${parsed.protocol || "(none)"}`);
  }
  // URL wraps IPv6 hosts in [brackets]; strip them for classification.
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (!host) throw new BlockedRequest("missing host");

  const candidates = ipaddr.isValid(host) ? [host] : await resolveIps(host);
  for (const ip of candidates) {
    if (isBlockedIp(ip) && !opts.allowPrivate) {
      throw new BlockedRequest(`target resolves to a blocked address: ${ip}`);
    }
  }
  return url;
}
