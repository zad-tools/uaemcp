/**
 * Export records to json | csv | geojson | xlsx.
 *
 * All four are dependency-free. XLSX is written as a "stored" (uncompressed)
 * ZIP of minimal SpreadsheetML — a valid .xlsx openable by Excel/LibreOffice —
 * so the npm package stays zero-dep and matches the hosted server's formats.
 */

import { toGeoJson } from "./geo.js";
import type { Source } from "./sources.js";

type Rec = Record<string, unknown>;
export const FORMATS = ["json", "csv", "geojson", "xlsx"] as const;
export type ExportFormat = (typeof FORMATS)[number];

const MEDIA: Record<ExportFormat, string> = {
  json: "application/json",
  csv: "text/csv; charset=utf-8",
  geojson: "application/geo+json",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function columns(records: Rec[]): string[] {
  const seen = new Set<string>();
  const cols: string[] = [];
  for (const rec of records) for (const k of Object.keys(rec)) if (!seen.has(k)) (seen.add(k), cols.push(k));
  return cols;
}

function toCsv(records: Rec[]): Buffer {
  const cols = columns(records);
  const esc = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [cols.map(esc).join(",")];
  for (const rec of records) lines.push(cols.map((c) => esc(cell(rec[c]))).join(","));
  return Buffer.from(lines.join("\r\n"), "utf-8");
}

// ── minimal stored-ZIP XLSX ──────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sheetXml(records: Rec[]): string {
  const cols = columns(records);
  const colRef = (i: number): string => {
    let n = i + 1;
    let s = "";
    while (n > 0) {
      const m = (n - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  };
  const rowXml = (values: string[], r: number): string =>
    `<row r="${r}">${values.map((v, i) => `<c r="${colRef(i)}${r}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`).join("")}</row>`;
  const rows = [rowXml(cols, 1)];
  records.forEach((rec, i) => rows.push(rowXml(cols.map((c) => cell(rec[c])), i + 2)));
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join("")}</sheetData></worksheet>`;
}

function zipStored(files: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf-8");
    const crc = crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method 0 = stored
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x21, 12); // date (1980-01-01)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(f.data.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, f.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(f.data.length, 20);
    central.writeUInt32LE(f.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + f.data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const localBuf = Buffer.concat(locals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);
  return Buffer.concat([localBuf, centralBuf, eocd]);
}

function toXlsx(records: Rec[]): Buffer {
  const b = (s: string): Buffer => Buffer.from(s, "utf-8");
  const files = [
    { name: "[Content_Types].xml", data: b('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>') },
    { name: "_rels/.rels", data: b('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
    { name: "xl/workbook.xml", data: b('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="data" sheetId="1" r:id="rId1"/></sheets></workbook>') },
    { name: "xl/_rels/workbook.xml.rels", data: b('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>') },
    { name: "xl/worksheets/sheet1.xml", data: b(sheetXml(records)) },
  ];
  return zipStored(files);
}

export function exportRecords(
  records: Rec[],
  fmt: ExportFormat,
  source: Source,
  dataset: string | null = null,
): { body: Buffer; media: string; filename: string } {
  if (!FORMATS.includes(fmt)) throw new Error(`format must be one of ${FORMATS.join(", ")}`);
  const stem = source.id + (dataset ? `_${dataset}` : "");
  let body: Buffer;
  if (fmt === "json") body = Buffer.from(JSON.stringify(records), "utf-8");
  else if (fmt === "geojson") body = Buffer.from(JSON.stringify(toGeoJson(records, source, dataset)), "utf-8");
  else if (fmt === "csv") body = toCsv(records);
  else body = toXlsx(records);
  return { body, media: MEDIA[fmt], filename: `${stem}.${fmt}` };
}
