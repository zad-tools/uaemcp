/**
 * PII redaction for open-data records.
 *
 * Direct-contact fields (phone, email) are redacted before anything leaves the
 * server, keyed both by field name and by value pattern so a renamed column is
 * still caught. Never mutates the input.
 */

export const REDACTED = "[redacted-open-data-contact]";

const PII_NAME_HINTS = [
  "phone",
  "mobile",
  "tel",
  "fax",
  "email",
  "contactnumber",
  "contactemail",
  "contactphone",
];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(?<!\d)(?:\+?\d[\d\s\-()]{6,}\d)(?!\d)/;

function fieldIsPii(name: string): boolean {
  const low = name.toLowerCase().replace(/[_-]/g, "");
  return PII_NAME_HINTS.some((h) => low.includes(h.replace(/[_-]/g, "")));
}

function looksLikeContact(value: string): boolean {
  if (EMAIL_RE.test(value)) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && PHONE_RE.test(value);
}

export function redactValue(name: string, value: unknown): unknown {
  if (typeof value === "string") {
    return fieldIsPii(name) || looksLikeContact(value) ? REDACTED : value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(name, v));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactValue(k, v);
    return out;
  }
  return value;
}

export function redactRecord(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) out[k] = redactValue(k, v);
  return out;
}

export function redactRecords(
  records: Record<string, unknown>[],
): Record<string, unknown>[] {
  return records.map(redactRecord);
}
