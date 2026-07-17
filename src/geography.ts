import { normalizeText } from "./glossary.js";

type Rec = Record<string, unknown>;

export interface Emirate {
  id: string;
  en: string;
  ar: string;
  code: string;
  aliases: string[];
}

export const UAE_EMIRATES: Emirate[] = [
  { id: "abu_dhabi", en: "Abu Dhabi", ar: "أبوظبي", code: "AUH", aliases: ["Abu Dhabi", "Abudhabi", "أبوظبي", "أبو ظبي", "AUH"] },
  { id: "dubai", en: "Dubai", ar: "دبي", code: "DXB", aliases: ["Dubai", "دبي", "DXB"] },
  { id: "sharjah", en: "Sharjah", ar: "الشارقة", code: "SHJ", aliases: ["Sharjah", "الشارقة", "شارقة", "SHJ"] },
  { id: "ajman", en: "Ajman", ar: "عجمان", code: "AJM", aliases: ["Ajman", "عجمان", "AJM"] },
  { id: "umm_al_quwain", en: "Umm Al Quwain", ar: "أم القيوين", code: "UAQ", aliases: ["Umm Al Quwain", "Umm al-Quwain", "أم القيوين", "ام القيوين", "UAQ"] },
  { id: "ras_al_khaimah", en: "Ras Al Khaimah", ar: "رأس الخيمة", code: "RAK", aliases: ["Ras Al Khaimah", "Ras al-Khaimah", "Ras Al Khaima", "رأس الخيمة", "راس الخيمة", "RAK"] },
  { id: "fujairah", en: "Fujairah", ar: "الفجيرة", code: "FUJ", aliases: ["Fujairah", "الفجيرة", "فجيرة", "FUJ"] },
];

const aliasIndex = new Map(UAE_EMIRATES.flatMap((emirate) => [emirate.en, emirate.ar, emirate.code, ...emirate.aliases].map((alias) => [normalizeText(alias), emirate] as const)));

export function normalizeEmirate(value: unknown): Omit<Emirate, "aliases"> | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const emirate = aliasIndex.get(normalizeText(value));
  return emirate ? { id: emirate.id, en: emirate.en, ar: emirate.ar, code: emirate.code } : null;
}

const EMIRATE_FIELDS = new Set(["emirate", "emiratenameen", "emiratenamear", "emirate_name", "الإمارة"].map((field) => normalizeText(field).replace(/ /g, "")));

export function emirateFromRecord(record: Rec): ReturnType<typeof normalizeEmirate> {
  for (const [key, value] of Object.entries(record)) {
    if (EMIRATE_FIELDS.has(normalizeText(key).replace(/ /g, ""))) {
      const emirate = normalizeEmirate(value);
      if (emirate) return emirate;
    }
  }
  return null;
}

export function normalizeGeography(record: Rec): Rec {
  const emirate = emirateFromRecord(record);
  return emirate ? { ...record, _normalized: { ...((record._normalized as Rec | undefined) ?? {}), emirate } } : { ...record };
}

export function resolveEntityKey(record: Rec, fields: string[]): string {
  const parts = fields.map((field) => {
    const value = record[field];
    const emirate = normalizeEmirate(value);
    return emirate?.id ?? normalizeText(String(value ?? ""));
  });
  return `uae_${Bun.hash(parts.join("\u001f")).toString(16)}`;
}
