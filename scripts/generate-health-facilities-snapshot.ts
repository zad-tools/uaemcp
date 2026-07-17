import { parseXlsx } from "../src/xlsx.js";

const SOURCE = "https://mohap.gov.ae/documents/20117/2530525/Health%20Facilities_2024.xlsx/dced0099-07e7-e749-0b8f-2955b22aa3fe";
const response = await fetch(SOURCE, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) throw new Error(`MOHAP returned HTTP ${response.status}`);
const bytes = new Uint8Array(await response.arrayBuffer());
const records = parseXlsx(bytes, 3, { headerRow: 7, dataStartRow: 8 });
if (records.length !== 950) throw new Error(`expected 950 records, received ${records.length}`);
const sha256 = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
const body = `// Generated from the official MOHAP workbook. Do not edit by hand.\nexport const MOHAP_HEALTH_FACILITIES_SNAPSHOT = ${JSON.stringify(records)} as const;\nexport const MOHAP_HEALTH_FACILITIES_SNAPSHOT_META = ${JSON.stringify({ source: SOURCE, retrievedAt: new Date().toISOString(), sha256, rows: records.length })} as const;\n`;
await Bun.write(new URL("../src/health-facilities-snapshot.ts", import.meta.url), body);
