/**
 * Open Emirates Pro API keys.
 *
 * Stateless, store-free keys: the key embeds the WooCommerce customer id and an
 * HMAC over it, signed with UAEMCP_PRO_KEY_SECRET. The storefront (issuer) and
 * this server (verifier) share only that secret — no key database anywhere.
 * Revocation happens at the billing layer: a cancelled entitlement fails the
 * quota check even for a validly-signed key.
 *
 * Format: oe_<customerId>_<sig16>   e.g. oe_18_9f2c47a1b03de584
 * Subject: wp:customer-<customerId> (the SaaSpress billing subject).
 */

const KEY_PATTERN = /^oe_(\d{1,10})_([0-9a-f]{16})$/;

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function deriveProKey(customerId: number, secret: string): Promise<string> {
  if (!Number.isSafeInteger(customerId) || customerId <= 0) throw new Error("invalid customer id");
  const sig = (await hmacHex(`oe-key:${customerId}`, secret)).slice(0, 16);
  return `oe_${customerId}_${sig}`;
}

/** Returns the billing subject for a valid key, or null for anything else. */
export async function verifyProKey(key: string, secret: string): Promise<string | null> {
  const match = KEY_PATTERN.exec(key.trim());
  if (!match) return null;
  const expected = (await hmacHex(`oe-key:${match[1]}`, secret)).slice(0, 16);
  // Constant-time-ish comparison; both sides are fixed-length hex.
  let diff = 0;
  for (let i = 0; i < 16; i++) diff |= expected.charCodeAt(i) ^ match[2].charCodeAt(i);
  return diff === 0 ? `wp:customer-${match[1]}` : null;
}
