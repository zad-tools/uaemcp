import { buildAeronauticalPublicationReport, parseAeronauticalPublications, type AeronauticalPublicationOptions } from "./aeronautical-publications.js";
import { GCAA_AIP_SNAPSHOT, GCAA_AIP_SNAPSHOT_META } from "./aeronautical-publications-snapshot.js";
import { getText } from "./http.js";

export const GCAA_AIP_URL = "https://www.gcaa.gov.ae/en/ais/AIPHtmlFiles/AIP/Current/UAE_AIP.html";
export const AERONAUTICAL_PUBLICATION_KINDS = ["airac_amendment", "supplement", "other"] as const;
type Fetcher = (url: string, params?: Record<string, unknown>, timeoutMs?: number) => Promise<string>;
let cache: { expiresAt: number; html: string; fetchedAt: string } | undefined;

export async function loadAeronauticalPublications(fetcher: Fetcher = getText, options: AeronauticalPublicationOptions = {}) {
  try {
    const retained = fetcher === getText && cache && Date.now() < cache.expiresAt ? cache : undefined;
    const html = retained?.html ?? await fetcher(GCAA_AIP_URL, undefined, 12_000);
    const fetchedAt = retained?.fetchedAt ?? new Date().toISOString();
    if (!retained && fetcher === getText) cache = { html, fetchedAt, expiresAt: Date.now() + 15 * 60 * 1000 };
    return { data: buildAeronauticalPublicationReport(parseAeronauticalPublications(html), { ...options, fetchedAt, citation: GCAA_AIP_URL }), meta: { source_id: "gcaa_current_aip_publications", citation: GCAA_AIP_URL, fetched_at: fetchedAt, delivery: "live", partial: false } } as const;
  } catch (error) {
    return { data: buildAeronauticalPublicationReport([...GCAA_AIP_SNAPSHOT], { ...options, fetchedAt: GCAA_AIP_SNAPSHOT_META.retrievedAt, citation: GCAA_AIP_SNAPSHOT_META.source }), meta: { source_id: "gcaa_current_aip_publications", citation: GCAA_AIP_SNAPSHOT_META.source, fetched_at: GCAA_AIP_SNAPSHOT_META.retrievedAt, delivery: "verified_snapshot", partial: true, upstream_error: error instanceof Error ? error.message : String(error), sha256: GCAA_AIP_SNAPSHOT_META.sha256 } } as const;
  }
}

export type { AeronauticalPublicationKind, AeronauticalPublicationOptions } from "./aeronautical-publications.js";
