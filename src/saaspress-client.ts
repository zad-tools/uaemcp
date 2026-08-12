// Minimal SaaSpress Protocol v0.1 client for Convex actions.
// Mirrors @saaspress/sdk-js signing byte-for-byte: canonical request v1 over
// method / path / sorted-RFC3986 query / unix-seconds timestamp / hex nonce /
// sha256 body hash, HMAC-SHA256 base64url signature. Web Crypto only — no
// node:crypto — so it runs unchanged inside the Convex runtime.

export interface SaaSpressConfig {
  baseUrl: string
  appId: string
  keyId: string
  secret: string
}

export function saaspressConfig(env: Record<string, string | undefined> = process.env): SaaSpressConfig | null {
  const baseUrl = (env.SAASPRESS_BASE_URL || '').replace(/\/+$/, '')
  const appId = env.SAASPRESS_APP_ID || ''
  const keyId = env.SAASPRESS_KEY_ID || ''
  const secret = env.SAASPRESS_SECRET || ''
  if (!baseUrl || !appId || !keyId || !secret) return null
  return { baseUrl, appId, keyId, secret }
}

const STORE_KEY_PATTERN = /^[a-z0-9-]{2,24}$/

// Each storefront (brand shop) is its own SaaSpress control plane, configured as
// SAASPRESS_<STORE>_BASE_URL / _APP_ID / _KEY_ID / _SECRET (store uppercased, '-' -> '_').
// 'naromx' predates multi-store and falls back to the unsuffixed variables.
export function saaspressConfigFor(store: string, env: Record<string, string | undefined> = process.env): SaaSpressConfig | null {
  if (!STORE_KEY_PATTERN.test(store)) return null
  const prefix = `SAASPRESS_${store.toUpperCase().replace(/-/g, '_')}_`
  const baseUrl = (env[`${prefix}BASE_URL`] || '').replace(/\/+$/, '')
  const appId = env[`${prefix}APP_ID`] || ''
  const keyId = env[`${prefix}KEY_ID`] || ''
  const secret = env[`${prefix}SECRET`] || ''
  if (baseUrl && appId && keyId && secret) return { baseUrl, appId, keyId, secret }
  return store === 'naromx' ? saaspressConfig(env) : null
}

// rawurlencode() semantics: encodeURIComponent plus the five characters it leaves bare.
const EXTRA_ENCODE: Record<string, string> = { '!': '%21', '*': '%2A', "'": '%27', '(': '%28', ')': '%29' }

export function rfc3986Encode(value: string): string {
  return encodeURIComponent(value).replace(/[!*'()]/g, (char) => EXTRA_ENCODE[char])
}

export function buildCanonicalQueryString(pairs: ReadonlyArray<readonly [string, string]>): string {
  const encoded = pairs.map(([key, value]) => `${rfc3986Encode(key)}=${rfc3986Encode(value)}`)
  encoded.sort()
  return encoded.join('&')
}

export function buildCanonicalRequestV1(input: {
  method: string
  path: string
  query: ReadonlyArray<readonly [string, string]>
  timestamp: string
  nonce: string
  bodyHash: string
}): string {
  return [
    'v1',
    input.method.toUpperCase(),
    input.path,
    buildCanonicalQueryString(input.query),
    input.timestamp,
    input.nonce,
    input.bodyHash.toLowerCase(),
  ].join('\n')
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function base64UrlEncode(bytes: ArrayBuffer): string {
  const binary = Array.from(new Uint8Array(bytes)).map((byte) => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return bytesToHex(digest)
}

export async function signCanonicalRequest(canonicalRequest: string, secret: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(canonicalRequest))
  return base64UrlEncode(signature)
}

async function signedHeaders(
  cfg: SaaSpressConfig,
  input: { method: 'GET' | 'POST'; path: string; query: ReadonlyArray<readonly [string, string]>; body?: string },
): Promise<Record<string, string>> {
  const timestamp = String(Math.floor(Date.now() / 1000))
  const nonceBytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(nonceBytes)
  const nonce = Array.from(nonceBytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const bodyHash = await sha256Hex(input.body ?? '')
  const canonical = buildCanonicalRequestV1({
    method: input.method, path: input.path, query: input.query, timestamp, nonce, bodyHash,
  })
  const signature = await signCanonicalRequest(canonical, cfg.secret)
  const headers: Record<string, string> = {
    'X-SaaSpress-Key-Id': cfg.keyId,
    'X-SaaSpress-Timestamp': timestamp,
    'X-SaaSpress-Nonce': nonce,
    'X-SaaSpress-Signature': signature,
  }
  if (input.body !== undefined) headers['Content-Type'] = 'application/json'
  return headers
}

export interface Entitlement {
  id: string
  subject: { type: string; externalId: string }
  plan: string
  status: string
  features: string[]
  limits: Record<string, number>
  validUntil: string | null
}

export type EntitlementResult = { found: true; entitlement: Entitlement } | { found: false }

// Signed path excludes the /wp-json REST prefix; the URL includes it (SDK convention).
const ENTITLEMENTS_PATH = '/saaspress/v1/entitlements'
const USAGE_PATH = '/saaspress/v1/events/usage'

export async function resolveEntitlement(
  cfg: SaaSpressConfig,
  subject: { subjectType: string; subjectExternalId: string },
): Promise<EntitlementResult> {
  const query: Array<[string, string]> = [
    ['subjectType', subject.subjectType],
    ['subjectExternalId', subject.subjectExternalId],
    ['appId', cfg.appId],
  ]
  const url = `${cfg.baseUrl}/wp-json${ENTITLEMENTS_PATH}?${buildCanonicalQueryString(query)}`
  const headers = await signedHeaders(cfg, { method: 'GET', path: ENTITLEMENTS_PATH, query })
  const res = await fetch(url, { method: 'GET', headers })
  if (res.status === 404) return { found: false }
  if (res.status !== 200) throw new Error(`saaspress entitlements: HTTP ${res.status}`)
  return { found: true, entitlement: await res.json() as Entitlement }
}

export interface UsageEvent {
  id: string
  appId: string
  subjectId: string
  metric: string
  quantity: number
  idempotencyKey: string
  occurredAt: string
}

export async function ingestUsage(cfg: SaaSpressConfig, event: UsageEvent): Promise<'accepted' | 'duplicate'> {
  const body = JSON.stringify(event)
  const headers = await signedHeaders(cfg, { method: 'POST', path: USAGE_PATH, query: [], body })
  const res = await fetch(`${cfg.baseUrl}/wp-json${USAGE_PATH}`, { method: 'POST', headers, body })
  if (res.status === 202) return 'accepted'
  if (res.status === 200) return 'duplicate'
  const detail = await res.text().catch(() => '')
  throw new Error(`saaspress usage: HTTP ${res.status} ${detail}`.slice(0, 300))
}

export type AccessReason =
  | 'allowed'
  | 'entitlement_not_found'
  | 'entitlement_inactive'
  | 'feature_unavailable'
  | 'limit_unavailable'
  | 'limit_exceeded'

// Same decision table as @saaspress/sdk-js access-check.
export function decideAccess(
  result: EntitlementResult,
  input: { feature?: string; metric?: string; currentUsage?: number; quantity?: number },
): { allowed: boolean; reason: AccessReason } {
  if (!result.found) return { allowed: false, reason: 'entitlement_not_found' }
  const entitlement = result.entitlement
  if (entitlement.status !== 'active' && entitlement.status !== 'trialing') {
    return { allowed: false, reason: 'entitlement_inactive' }
  }
  if (input.feature !== undefined && !(entitlement.features || []).includes(input.feature)) {
    return { allowed: false, reason: 'feature_unavailable' }
  }
  if (input.metric !== undefined) {
    const limit = entitlement.limits?.[input.metric]
    if (typeof limit !== 'number') return { allowed: false, reason: 'limit_unavailable' }
    if ((input.currentUsage ?? 0) + (input.quantity ?? 1) > limit) {
      return { allowed: false, reason: 'limit_exceeded' }
    }
  }
  return { allowed: true, reason: 'allowed' }
}
