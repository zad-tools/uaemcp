import { unzipSync } from "fflate";
import { ValidationError } from "./errors.js";

type Rec = Record<string, unknown>;
export interface XlsxParseOptions {
  headerRow?: number;
  dataStartRow?: number;
  columns?: Record<string, string>;
}
const decoder = new TextDecoder();

function entity(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, (match) => {
    const named: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
    if (named[match]) return named[match];
    const hex = match.startsWith("&#x");
    const code = Number.parseInt(match.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : match;
  });
}

function zipBudget(bytes: Uint8Array, maximum = 20 * 1024 * 1024): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let total = 0;
  let entries = 0;
  for (let offset = 0; offset + 46 <= bytes.length; offset += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) continue;
    total += view.getUint32(offset + 24, true);
    entries += 1;
    if (total > maximum || entries > 500) throw new ValidationError("XLSX archive exceeds the safe extraction budget");
    const name = view.getUint16(offset + 28, true);
    const extra = view.getUint16(offset + 30, true);
    const comment = view.getUint16(offset + 32, true);
    offset += 45 + name + extra + comment;
  }
  if (!entries) throw new ValidationError("file is not a valid XLSX archive");
}

function texts(xml: string): string[] {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => entity(match[1]));
}

function column(reference: string): number {
  const letters = reference.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? "A";
  return [...letters].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

export function parseXlsx(bytes: Uint8Array, sheet = 1, options: XlsxParseOptions = {}): Rec[] {
  for (const [name, value] of [["headerRow", options.headerRow], ["dataStartRow", options.dataStartRow]] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1)) throw new ValidationError(`XLSX ${name} must be a positive integer`);
  }
  zipBudget(bytes);
  const files = unzipSync(bytes);
  const worksheet = files[`xl/worksheets/sheet${sheet}.xml`];
  if (!worksheet) throw new ValidationError(`XLSX worksheet ${sheet} not found`);
  const sharedXml = files["xl/sharedStrings.xml"] ? decoder.decode(files["xl/sharedStrings.xml"]) : "";
  const shared = [...sharedXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((match) => texts(match[1]).join(""));
  const xml = decoder.decode(worksheet);
  const matrix: unknown[][] = [];
  for (const rowMatch of xml.matchAll(/<row([^>]*)>([\s\S]*?)<\/row>/g)) {
    const row: unknown[] = [];
    const physicalRow = Number(rowMatch[1].match(/\br="(\d+)"/)?.[1] ?? matrix.length + 1);
    for (const cellMatch of rowMatch[2].matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/\br="([^"]+)"/)?.[1] ?? `A${physicalRow}`;
      const type = attrs.match(/\bt="([^"]+)"/)?.[1] ?? "n";
      const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? texts(body).join("");
      let value: unknown = entity(raw);
      if (type === "s") value = shared[Number(raw)] ?? "";
      else if (type === "n" && raw !== "") value = Number(raw);
      else if (type === "b") value = raw === "1";
      row[column(ref)] = value;
    }
    matrix[physicalRow - 1] = row;
  }
  const headerIndex = Math.max(0, (options.headerRow ?? 1) - 1);
  const dataStartIndex = Math.max(headerIndex + 1, (options.dataStartRow ?? headerIndex + 2) - 1);
  if (options.columns) {
    const selected = Object.entries(options.columns).map(([name, reference]) => {
      if (!name.trim() || !/^[A-Z]+$/i.test(reference)) throw new ValidationError("XLSX column mapping is invalid");
      return [name.trim(), column(reference)] as const;
    });
    if (!selected.length || new Set(selected.map(([name]) => name)).size !== selected.length) throw new ValidationError("XLSX column mapping contains duplicate headers");
    return matrix.slice(dataStartIndex)
      .filter((row) => selected.some(([, index]) => row[index] !== undefined && row[index] !== ""))
      .map((row) => Object.fromEntries(selected.map(([name, index]) => [name, row[index] ?? null])));
  }
  const headers = (matrix[headerIndex] ?? []).map((value, index) => String(value ?? "").trim() || `column_${index + 1}`);
  if (!headers.length) return [];
  if (new Set(headers).size !== headers.length) throw new ValidationError("XLSX contains duplicate headers");
  return matrix.slice(dataStartIndex).filter((row) => row.some((value) => value !== undefined && value !== "")).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])));
}
