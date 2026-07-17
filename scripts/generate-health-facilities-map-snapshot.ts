import { parseXlsx } from "../src/xlsx.js";

const SOURCE = "https://mohap.gov.ae/documents/20117/2614454/%D8%A7%D9%84%D9%85%D9%88%D9%82%D8%B9%20%D8%A7%D9%84%D8%AC%D8%BA%D8%B1%D8%A7%D9%81%D9%8A%20%D9%84%D9%84%D9%85%D9%86%D8%B4%D8%A2%D8%AA%20%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D8%A9%C2%A0%20%E2%80%93%20%D9%84%D8%B9%D8%A7%D9%85%202026%20Geocoded%20Location%20of%20Health%20Facilities%20-%20GIS%C2%A0.xlsx/a88cb9b8-690e-14f7-37c1-77fd188e5b23";
const localFile = process.env.MOHAP_HEALTH_MAP_FILE;
const bytes = localFile
  ? new Uint8Array(await Bun.file(localFile).arrayBuffer())
  : new Uint8Array(await (await fetch(SOURCE, { signal: AbortSignal.timeout(30_000) })).arrayBuffer());
const records = parseXlsx(bytes, 2, { headerRow: 4, dataStartRow: 5 }).slice(0, 15_326).map((record) => ({
  "No.": record["No."],
  "Facility Name English": record["Facility Name English"],
  "Facility Name Arabic": record["Facility Name Arabic"],
  Coordinator: record.Coordinator,
}));
if (records.length !== 15_326) throw new Error(`expected 15326 records, received ${records.length}`);
const sha256 = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
const body = `// Generated from the official MOHAP workbook. Do not edit by hand.\nexport const MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT = ${JSON.stringify(records)} as const;\nexport const MOHAP_HEALTH_FACILITIES_MAP_SNAPSHOT_META = ${JSON.stringify({ source: SOURCE, retrievedAt: new Date().toISOString(), sha256, sourceRows: records.length, retainedRows: records.length })} as const;\n`;
await Bun.write(new URL("../src/health-facilities-map-snapshot.ts", import.meta.url), body);
