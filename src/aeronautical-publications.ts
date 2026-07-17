export type AeronauticalPublicationKind = "airac_amendment" | "supplement" | "other";

export interface AeronauticalPublicationOptions {
  kind?: AeronauticalPublicationKind;
  limit?: number;
}

const MAX_HTML_BYTES = 2_000_000;
const MAX_CELL_CHARS = 2_000;
const MAX_PUBLICATIONS = 500;
const PUBLICATION_KINDS = new Set<AeronauticalPublicationKind>(["airac_amendment", "supplement", "other"]);

function text(value: string): string {
  return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\r/g, "").split("\n").map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

function dates(value: string): string[] {
  return text(value).split("\n").filter(Boolean);
}

function classify(description: string): AeronauticalPublicationKind {
  if (/^AIRAC\s+AMDT\b/i.test(description)) return "airac_amendment";
  if (/^SUP\s+\d+/i.test(description)) return "supplement";
  return "other";
}

export function parseAeronauticalPublications(html: string) {
  if (typeof html !== "string" || html.length < 100) throw new Error("invalid GCAA AIP publication page");
  if (html.length > MAX_HTML_BYTES) throw new Error("GCAA AIP publication page is too large");
  const rows = [...html.matchAll(/<tr(?:\s[^>]*)?>([\s\S]*?)<\/tr>/gi)].flatMap((match) => {
    const cells = [...match[1]!.matchAll(/<td(?:\s[^>]*)?>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1]!);
    if (cells.length !== 4) return [];
    if (cells.some((cell) => cell.length > MAX_CELL_CHARS)) throw new Error("GCAA AIP publication cell exceeds the safe size limit");
    const packageDate = dates(cells[0]!)[0];
    const publicationDates = dates(cells[1]!);
    const effectiveDates = dates(cells[2]!);
    const descriptions = dates(cells[3]!);
    if (!packageDate || descriptions.length === 0) return [];
    return descriptions.map((description, index) => ({
      packageDate,
      publicationDate: publicationDates[index] ?? publicationDates.at(-1) ?? null,
      effectiveDate: effectiveDates[index] ?? effectiveDates.at(-1) ?? null,
      description,
      kind: classify(description),
    }));
  });
  if (rows.length === 0) throw new Error("GCAA AIP page contained no publication rows");
  if (rows.length > MAX_PUBLICATIONS) throw new Error("GCAA AIP page contained too many publication rows");
  return rows;
}

export function buildAeronauticalPublicationReport(
  rows: ReturnType<typeof parseAeronauticalPublications>,
  options: AeronauticalPublicationOptions & { fetchedAt: string; citation: string },
) {
  const limit = options.limit ?? 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("limit must be an integer from 1 to 50");
  if (options.kind !== undefined && !PUBLICATION_KINDS.has(options.kind)) throw new Error("kind must be airac_amendment, supplement or other");
  const selected = rows.filter((row) => !options.kind || row.kind === options.kind).slice(0, limit);
  return {
    kind: "uae_aeronautical_publications",
    generatedAt: options.fetchedAt,
    scope: { parsed: rows.length, matched: rows.filter((row) => !options.kind || row.kind === options.kind).length, returned: selected.length },
    publications: selected,
    evidence: { citation: options.citation, authority: "UAE General Civil Aviation Authority", sourceSurface: "Current UAE eAIP publication index" },
    methodology: { interpretation: false, dateTreatment: "Dates and publication descriptions are reproduced from the current GCAA index without operational interpretation." },
    limitations: [
      "This is a publication index, not aeronautical operational guidance, flight-planning information or a substitute for NOTAM and the current official AIP package.",
      "A publication or effective date does not prove that every linked operational detail remains unchanged; users must consult the official GCAA source.",
      "UAEMCP does not interpret regulatory effect, airspace status, route availability or safety impact.",
    ],
  } as const;
}
