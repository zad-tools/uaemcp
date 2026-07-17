import { getText as fetchText } from "./http.js";
import {
  PolicyEvidenceStore,
  buildPolicyEvidenceSnapshot,
  diffPolicyEvidence,
  type PolicyEvidenceSectionInput,
} from "./policy-evidence-watch.js";
import { SETTINGS } from "./config.js";

export const POLICY_WATCH_SOURCE_IDS = [
  "uae_legislation_catalogue",
  "fta_legislation_index",
  "mohre_resolutions_circulars",
  "icp_policy_announcements",
  "uae_cabinet_news",
] as const;

export type PolicyWatchSourceId = typeof POLICY_WATCH_SOURCE_IDS[number];
export type PolicyWatchLocalizedText = Readonly<{ en: string; ar: string }>;

export type PolicyWatchSource = Readonly<{
  id: PolicyWatchSourceId;
  title: PolicyWatchLocalizedText;
  category: "legislation" | "tax" | "labour" | "residency" | "cabinet";
  citation: string;
  claim: "content_change_only";
}>;

export const POLICY_WATCH_SOURCES: readonly PolicyWatchSource[] = deepFreeze([
  { id: "uae_legislation_catalogue", title: { en: "UAE Legislation", ar: "تشريعات الإمارات" }, category: "legislation", citation: "https://uaelegislation.gov.ae/en", claim: "content_change_only" },
  { id: "fta_legislation_index", title: { en: "FTA Legislation", ar: "تشريعات الهيئة الاتحادية للضرائب" }, category: "tax", citation: "https://tax.gov.ae/en/Legislation.aspx", claim: "content_change_only" },
  { id: "mohre_resolutions_circulars", title: { en: "MOHRE Resolutions & Circulars", ar: "قرارات وتعاميم وزارة الموارد البشرية" }, category: "labour", citation: "https://www.mohre.gov.ae/en/laws-and-regulations/resolutions-and-circulars", claim: "content_change_only" },
  { id: "icp_policy_announcements", title: { en: "ICP Policy Announcements", ar: "إعلانات سياسات الهيئة" }, category: "residency", citation: "https://icp.gov.ae/ica_media-sitemap.xml", claim: "content_change_only" },
  { id: "uae_cabinet_news", title: { en: "UAE Cabinet News", ar: "أخبار مجلس الوزراء" }, category: "cabinet", citation: "https://uaecabinet.ae/en/news", claim: "content_change_only" },
] satisfies PolicyWatchSource[]);

type SourceStatus = "never_checked" | "changed" | "unchanged" | "unavailable";
type ChangeType = "first_snapshot" | "content_changed" | "unchanged" | "check_failed";

export type PolicyWatchSourceResult = Readonly<PolicyWatchSource & {
  status: SourceStatus;
  checkedAt: string | null;
  latestSnapshotAt: string | null;
  previousSnapshotAt: string | null;
  currentHash: string | null;
  error?: string;
}>;

export type PolicyWatchChangeResult = Readonly<{
  sourceId: PolicyWatchSourceId;
  title: PolicyWatchLocalizedText;
  citation: string;
  changeType: ChangeType;
  detectedAt: string;
  beforeHash: string | null;
  afterHash: string | null;
  changes?: Readonly<{
    added: readonly Readonly<{ id: string; hash: string }>[];
    removed: readonly Readonly<{ id: string; hash: string }>[];
    modified: readonly Readonly<{ id: string; beforeHash: string; afterHash: string }>[];
  }>;
  error?: string;
}>;

export type PolicyWatchReport = Readonly<{
  sources: readonly PolicyWatchSourceResult[];
  summary: Readonly<{ requested: number; checked: number; baseline: number; changed: number; unchanged: number; unavailable: number }>;
  changes: readonly PolicyWatchChangeResult[];
  limitations: readonly PolicyWatchLocalizedText[];
  generatedAt: string;
}>;

export type PolicyWatchDependencies = Readonly<{
  getText?: (url: string) => Promise<string>;
  store?: PolicyEvidenceStore;
  generatedAt?: string;
}>;

const registry = new Map(POLICY_WATCH_SOURCES.map((source) => [source.id, source]));
const sharedStore = new PolicyEvidenceStore({ path: SETTINGS.policyWatchPath, retentionPerSource: SETTINGS.policyWatchRetention });
export const policyEvidenceStore = (): PolicyEvidenceStore => sharedStore;
const MAX_HTML_CHARACTERS = 1_000_000;
const MAX_SECTIONS = 50;
const MAX_SECTION_CHARACTERS = 20_000;

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/giu, (entity, code: string) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
    const numeric = code[1]?.toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
    return Number.isFinite(numeric) && numeric > 0 && numeric <= 0x10ffff ? String.fromCodePoint(numeric) : entity;
  });
}

function textOf(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/gu, " ")).replace(/\s+/gu, " ").trim();
}

function sectionId(title: string, index: number, used: Set<string>): string {
  const base = title.normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 80) || `section-${String(index + 1).padStart(2, "0")}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) { id = `${base}-${suffix}`; suffix += 1; }
  used.add(id);
  return id;
}

export function parsePolicyEvidenceHtml(rawHtml: string): PolicyEvidenceSectionInput[] {
  if (typeof rawHtml !== "string" || rawHtml.trim().length === 0) throw new Error("official page returned no text");
  if (rawHtml.length > MAX_HTML_CHARACTERS) throw new Error(`official page exceeds ${MAX_HTML_CHARACTERS} characters`);
  const html = rawHtml
    .replace(/<!--[\s\S]*?-->/gu, " ")
    .replace(/<(script|style|noscript|svg|nav|header|footer|form)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, " ");
  const headingPattern = /<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1\s*>/giu;
  const headings = [...html.matchAll(headingPattern)];
  const used = new Set<string>();
  const sections = headings.slice(0, MAX_SECTIONS).flatMap((match, index): PolicyEvidenceSectionInput[] => {
    const title = textOf(match[2] ?? "").slice(0, 300);
    const start = (match.index ?? 0) + match[0].length;
    const end = headings[index + 1]?.index ?? html.length;
    const text = textOf(html.slice(start, end)).slice(0, MAX_SECTION_CHARACTERS);
    if (!title || !text) return [];
    return [{ id: sectionId(title, index, used), title, text }];
  });
  if (sections.length > 0) return sections;
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/iu);
  const title = textOf(titleMatch?.[1] ?? "Official published page").slice(0, 300) || "Official published page";
  const text = textOf(html).slice(0, MAX_SECTION_CHARACTERS);
  if (!text) throw new Error("official page contains no bounded evidence text");
  return [{ id: "document", title, text }];
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/\s+/gu, " ").slice(0, 300) || "official page unavailable";
}

export async function checkPolicyEvidenceWatch(sourceIds: readonly string[], dependencies: PolicyWatchDependencies = {}): Promise<PolicyWatchReport> {
  if (!Array.isArray(sourceIds) || sourceIds.length < 1 || sourceIds.length > 5) throw new Error("sourceIds must contain 1-5 entries");
  if (new Set(sourceIds).size !== sourceIds.length) throw new Error("sourceIds must be unique");
  const sources = sourceIds.map((id) => {
    const source = registry.get(id as PolicyWatchSourceId);
    if (!source) throw new Error(`source '${id}' is not allowlisted`);
    return source;
  });
  const generatedAt = dependencies.generatedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(generatedAt))) throw new Error("generatedAt must be an ISO date");
  const getText = dependencies.getText ?? ((url: string) => fetchText(url));
  const store = dependencies.store ?? sharedStore;

  const observations = await Promise.all(sources.map(async (source): Promise<{ source: PolicyWatchSourceResult; change: PolicyWatchChangeResult }> => {
    const previousSnapshots = store.list(source.id);
    const previous = previousSnapshots[0] ?? null;
    try {
      const html = await getText(source.citation);
      const snapshot = buildPolicyEvidenceSnapshot({
        sourceId: source.id,
        citation: source.citation,
        capturedAt: generatedAt,
        title: source.title.en,
        sections: parsePolicyEvidenceHtml(html),
      });
      store.save(snapshot);
      if (previous === null) {
        return {
          source: { ...source, status: "unchanged", checkedAt: generatedAt, latestSnapshotAt: snapshot.capturedAt, previousSnapshotAt: null, currentHash: snapshot.contentHash },
          change: { sourceId: source.id, title: source.title, citation: source.citation, changeType: "first_snapshot", detectedAt: generatedAt, beforeHash: null, afterHash: snapshot.contentHash },
        };
      }
      const difference = diffPolicyEvidence(previous, snapshot);
      const changed = difference.status === "changed";
      return {
        source: { ...source, status: changed ? "changed" : "unchanged", checkedAt: generatedAt, latestSnapshotAt: snapshot.capturedAt, previousSnapshotAt: previous.capturedAt, currentHash: snapshot.contentHash },
        change: { sourceId: source.id, title: source.title, citation: source.citation, changeType: changed ? "content_changed" : "unchanged", detectedAt: generatedAt, beforeHash: previous.contentHash, afterHash: snapshot.contentHash, changes: difference.changes },
      };
    } catch (error) {
      const message = errorMessage(error);
      return {
        source: { ...source, status: "unavailable", checkedAt: generatedAt, latestSnapshotAt: previous?.capturedAt ?? null, previousSnapshotAt: previousSnapshots[1]?.capturedAt ?? null, currentHash: previous?.contentHash ?? null, error: message },
        change: { sourceId: source.id, title: source.title, citation: source.citation, changeType: "check_failed", detectedAt: generatedAt, beforeHash: previous?.contentHash ?? null, afterHash: null, error: message },
      };
    }
  }));
  const results = observations.map(({ source }) => source);
  for (const { source, change } of observations) {
    store.recordObservation({
      sourceId: source.id,
      checkedAt: change.detectedAt,
      status: source.status === "unavailable" ? "unavailable" : source.status === "changed" ? "changed" : "unchanged",
      changeType: change.changeType,
      beforeHash: change.beforeHash,
      afterHash: change.afterHash,
      ...(change.error ? { error: change.error } : {}),
    });
  }
  const count = (status: SourceStatus) => results.filter((source) => source.status === status).length;
  const baseline = observations.filter(({ change }) => change.changeType === "first_snapshot").length;
  const unavailable = count("unavailable");
  return deepFreeze({
    sources: results,
    summary: { requested: results.length, checked: results.length - unavailable, baseline, changed: count("changed"), unchanged: count("unchanged"), unavailable },
    changes: observations.map(({ change }) => change),
    limitations: [
      { en: "A detected published-content difference is not proof of a legal or policy change and does not determine an effective date.", ar: "اختلاف المحتوى المنشور المكتشف ليس دليلًا على تغيير قانوني أو في السياسة ولا يحدد تاريخ النفاذ." },
      { en: "An unavailable check is not classified as unchanged; the last retained hash remains historical evidence only.", ar: "لا يُصنف الفحص غير المتاح باعتباره دون تغيير؛ وتبقى آخر بصمة محتفظ بها دليلًا تاريخيًا فقط." },
      { en: "Only normalized hashes and bounded excerpts are retained. Always review the cited current official publication before acting.", ar: "لا يُحتفظ إلا بالبصمات المطبعة والمقتطفات المحدودة. راجع دائمًا المنشور الرسمي الحالي المستشهد به قبل التصرف." },
    ],
    generatedAt,
  });
}

export function policyEvidenceWatchReport(store = sharedStore, generatedAt = new Date().toISOString()): PolicyWatchReport {
  const allObservations = store.observations(undefined, 1_000);
  const latestBySource = new Map<string, typeof allObservations[number]>();
  for (const observation of allObservations) if (!latestBySource.has(observation.sourceId)) latestBySource.set(observation.sourceId, observation);
  const sources = POLICY_WATCH_SOURCES.map((source): PolicyWatchSourceResult => {
    const observation = latestBySource.get(source.id);
    const snapshots = store.list(source.id);
    return {
      ...source,
      status: observation?.status ?? "never_checked",
      checkedAt: observation?.checkedAt ?? null,
      latestSnapshotAt: snapshots[0]?.capturedAt ?? null,
      previousSnapshotAt: snapshots[1]?.capturedAt ?? null,
      currentHash: snapshots[0]?.contentHash ?? null,
      ...(observation?.error ? { error: observation.error } : {}),
    };
  });
  const sourceMap = new Map(POLICY_WATCH_SOURCES.map((source) => [source.id, source]));
  const changes = allObservations.map((observation): PolicyWatchChangeResult => {
    const source = sourceMap.get(observation.sourceId as PolicyWatchSourceId)!;
    return {
      sourceId: source.id,
      title: source.title,
      citation: source.citation,
      changeType: observation.changeType,
      detectedAt: observation.checkedAt,
      beforeHash: observation.beforeHash,
      afterHash: observation.afterHash,
      ...(observation.error ? { error: observation.error } : {}),
    };
  });
  const count = (status: SourceStatus) => sources.filter((source) => source.status === status).length;
  const unavailable = count("unavailable");
  const neverChecked = count("never_checked");
  return deepFreeze({
    sources,
    summary: {
      requested: sources.length,
      checked: sources.length - unavailable - neverChecked,
      baseline: [...latestBySource.values()].filter(({ changeType }) => changeType === "first_snapshot").length,
      changed: count("changed"),
      unchanged: count("unchanged"),
      unavailable: unavailable + neverChecked,
    },
    changes,
    limitations: [
      { en: "A detected published-content difference is not proof of a legal or policy change and does not determine an effective date.", ar: "اختلاف المحتوى المنشور المكتشف ليس دليلًا على تغيير قانوني أو في السياسة ولا يحدد تاريخ النفاذ." },
      { en: "Never checked and unavailable are not classified as unchanged.", ar: "لا تُصنف حالة لم يُفحص أو غير متاح باعتبارها دون تغيير." },
      { en: "Only normalized hashes and bounded excerpts are retained. Review the cited official publication before acting.", ar: "لا يُحتفظ إلا بالبصمات المطبعة والمقتطفات المحدودة. راجع المنشور الرسمي المستشهد به قبل التصرف." },
    ],
    generatedAt,
  });
}
