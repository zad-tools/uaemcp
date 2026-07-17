import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type PolicyEvidenceSectionInput = Readonly<{ id: string; title: string; text: string }>;

export type PolicyEvidenceSnapshotInput = Readonly<{
  sourceId: string;
  citation: string;
  capturedAt: string;
  title: string;
  sections: readonly PolicyEvidenceSectionInput[];
}>;

export type PolicyEvidenceSection = Readonly<{
  id: string;
  title: string;
  contentHash: string;
  characterCount: number;
  excerpt: string;
}>;

export type PolicyEvidenceSnapshot = Readonly<{
  kind: "uae_policy_evidence_snapshot";
  sourceId: string;
  citation: string;
  capturedAt: string;
  title: string;
  sections: readonly PolicyEvidenceSection[];
  contentHash: string;
}>;

export type PolicyEvidenceChange = Readonly<{
  kind: "uae_policy_evidence_change";
  sourceId: string;
  from: Readonly<{ capturedAt: string; contentHash: string }>;
  to: Readonly<{ capturedAt: string; contentHash: string }>;
  status: "changed" | "unchanged";
  changes: Readonly<{
    added: readonly Readonly<{ id: string; hash: string }>[];
    removed: readonly Readonly<{ id: string; hash: string }>[];
    modified: readonly Readonly<{ id: string; beforeHash: string; afterHash: string }>[];
  }>;
  methodology: Readonly<{
    operation: "normalized_text_hash_diff";
    interpretation: "content_change_only";
    legalEffectDetermined: false;
    eligibilityDetermined: false;
  }>;
  limitations: readonly string[];
}>;

export type PolicyEvidenceObservation = Readonly<{
  sourceId: string;
  checkedAt: string;
  status: "unchanged" | "changed" | "unavailable";
  changeType: "first_snapshot" | "content_changed" | "unchanged" | "check_failed";
  beforeHash: string | null;
  afterHash: string | null;
  error?: string;
}>;

type StoredDocument = Readonly<{
  version: 1 | 2;
  snapshots: readonly PolicyEvidenceSnapshot[];
  observations?: readonly PolicyEvidenceObservation[];
}>;

function normalize(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function required(value: unknown, field: string, maximum: number): string {
  if (typeof value !== "string") throw new Error(`${field} must be text`);
  const normalized = normalize(value);
  if (!normalized || normalized.length > maximum) throw new Error(`${field} must contain 1-${maximum} characters`);
  return normalized;
}

function sha256(value: string): string {
  return new Bun.CryptoHasher("sha256").update(value).digest("hex");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function buildPolicyEvidenceSnapshot(input: PolicyEvidenceSnapshotInput): PolicyEvidenceSnapshot {
  if (!input || typeof input !== "object") throw new Error("snapshot input must be an object");
  const sourceId = required(input.sourceId, "sourceId", 100);
  const title = required(input.title, "title", 300);
  const capturedAt = required(input.capturedAt, "capturedAt", 100);
  if (!Number.isFinite(Date.parse(capturedAt))) throw new Error("capturedAt must be an ISO date");
  const rawCitation = required(input.citation, "citation", 2_000);
  let citation: URL;
  try { citation = new URL(rawCitation); } catch { throw new Error("citation must be an HTTPS URL"); }
  if (citation.protocol !== "https:") throw new Error("citation must be an HTTPS URL");
  if (!Array.isArray(input.sections) || input.sections.length === 0 || input.sections.length > 200) throw new Error("sections must contain 1-200 entries");

  const sections = input.sections.map((section, index): PolicyEvidenceSection => {
    if (!section || typeof section !== "object") throw new Error(`sections[${index}] must be an object`);
    const id = required(section.id, `sections[${index}].id`, 100);
    const sectionTitle = required(section.title, `sections[${index}].title`, 300);
    const text = required(section.text, `sections[${index}].text`, 20_000);
    return {
      id,
      title: sectionTitle,
      contentHash: sha256(JSON.stringify([sectionTitle, text])),
      characterCount: text.length,
      excerpt: text.slice(0, 240),
    };
  });
  if (new Set(sections.map(({ id }) => id)).size !== sections.length) throw new Error("section ids must be unique");
  const contentHash = sha256(JSON.stringify(sections.map(({ id, contentHash }) => [id, contentHash])));
  return deepFreeze({ kind: "uae_policy_evidence_snapshot", sourceId, citation: citation.href, capturedAt, title, sections, contentHash });
}

function validateStoredSnapshot(input: PolicyEvidenceSnapshot): PolicyEvidenceSnapshot {
  if (!input || input.kind !== "uae_policy_evidence_snapshot") throw new Error("stored policy evidence snapshot is invalid");
  const sourceId = required(input.sourceId, "sourceId", 100);
  const title = required(input.title, "title", 300);
  const capturedAt = required(input.capturedAt, "capturedAt", 100);
  if (!Number.isFinite(Date.parse(capturedAt))) throw new Error("capturedAt must be an ISO date");
  const rawCitation = required(input.citation, "citation", 2_000);
  const citation = new URL(rawCitation);
  if (citation.protocol !== "https:") throw new Error("citation must be an HTTPS URL");
  if (!Array.isArray(input.sections) || !input.sections.length || input.sections.length > 200) throw new Error("stored sections are invalid");
  const sections = input.sections.map((section, index) => {
    const id = required(section.id, `sections[${index}].id`, 100);
    const sectionTitle = required(section.title, `sections[${index}].title`, 300);
    const excerpt = required(section.excerpt, `sections[${index}].excerpt`, 240);
    if (!/^[a-f0-9]{64}$/.test(section.contentHash)) throw new Error(`sections[${index}].contentHash is invalid`);
    if (!Number.isInteger(section.characterCount) || section.characterCount < excerpt.length || section.characterCount > 20_000) throw new Error(`sections[${index}].characterCount is invalid`);
    return { id, title: sectionTitle, excerpt, characterCount: section.characterCount, contentHash: section.contentHash };
  });
  if (new Set(sections.map(({ id }) => id)).size !== sections.length) throw new Error("section ids must be unique");
  const contentHash = sha256(JSON.stringify(sections.map(({ id, contentHash }) => [id, contentHash])));
  if (contentHash !== input.contentHash) throw new Error("stored policy evidence snapshot failed hash verification");
  return deepFreeze({ kind: "uae_policy_evidence_snapshot", sourceId, citation: citation.href, capturedAt, title, sections, contentHash });
}

export function diffPolicyEvidence(before: PolicyEvidenceSnapshot, after: PolicyEvidenceSnapshot): PolicyEvidenceChange {
  if (before.sourceId !== after.sourceId) throw new Error("policy evidence snapshots must belong to the same source");
  const previous = new Map(before.sections.map((section) => [section.id, section]));
  const current = new Map(after.sections.map((section) => [section.id, section]));
  const added = after.sections.filter(({ id }) => !previous.has(id)).map(({ id, contentHash }) => ({ id, hash: contentHash }));
  const removed = before.sections.filter(({ id }) => !current.has(id)).map(({ id, contentHash }) => ({ id, hash: contentHash }));
  const modified = after.sections.flatMap(({ id, contentHash }) => {
    const oldHash = previous.get(id)?.contentHash;
    return oldHash !== undefined && oldHash !== contentHash ? [{ id, beforeHash: oldHash, afterHash: contentHash }] : [];
  });
  const changed = added.length > 0 || removed.length > 0 || modified.length > 0;
  return deepFreeze({
    kind: "uae_policy_evidence_change",
    sourceId: before.sourceId,
    from: { capturedAt: before.capturedAt, contentHash: before.contentHash },
    to: { capturedAt: after.capturedAt, contentHash: after.contentHash },
    status: changed ? "changed" : "unchanged",
    changes: { added, removed, modified },
    methodology: {
      operation: "normalized_text_hash_diff",
      interpretation: "content_change_only",
      legalEffectDetermined: false,
      eligibilityDetermined: false,
    },
    limitations: [
      "A detected text change does not determine legal effect, effective date, eligibility or whether an authority changed its policy.",
      "Formatting-only whitespace changes are normalized and may not appear as changes.",
      "Review the cited official page and competent authority before acting on any detected difference.",
    ],
  });
}

export type PolicyEvidenceStoreOptions = Readonly<{ path?: string | null; retentionPerSource?: number }>;

export class PolicyEvidenceStore {
  readonly path: string | null;
  readonly retentionPerSource: number;
  #snapshots: PolicyEvidenceSnapshot[];
  #observations: PolicyEvidenceObservation[];

  constructor(options: PolicyEvidenceStoreOptions = {}) {
    this.path = options.path ?? null;
    const retention = options.retentionPerSource ?? 30;
    if (!Number.isInteger(retention) || retention < 2 || retention > 1_000) throw new Error("retentionPerSource must be an integer from 2 to 1000");
    this.retentionPerSource = retention;
    const stored = this.path === null ? { snapshots: [], observations: [] } : this.#read(this.path);
    this.#snapshots = stored.snapshots;
    this.#observations = stored.observations;
  }

  save(snapshot: PolicyEvidenceSnapshot): Readonly<{ created: boolean; unchanged: boolean; sourceId: string; contentHash: string; capturedAt: string }> {
    const copy = validateStoredSnapshot(snapshot);
    const existing = this.#snapshots.find(({ sourceId, contentHash }) => sourceId === copy.sourceId && contentHash === copy.contentHash);
    if (existing) return deepFreeze({ created: false, unchanged: true, sourceId: existing.sourceId, contentHash: existing.contentHash, capturedAt: existing.capturedAt });
    const next = [...this.#snapshots, copy]
      .sort((left, right) => left.capturedAt.localeCompare(right.capturedAt))
      .filter((item, index, all) => all.filter(({ sourceId }) => sourceId === item.sourceId).slice(-this.retentionPerSource).includes(item));
    this.#snapshots = next;
    this.#persist();
    return deepFreeze({ created: true, unchanged: false, sourceId: copy.sourceId, contentHash: copy.contentHash, capturedAt: copy.capturedAt });
  }

  list(sourceId: string): readonly PolicyEvidenceSnapshot[] {
    const id = required(sourceId, "sourceId", 100);
    return deepFreeze(this.#snapshots.filter((snapshot) => snapshot.sourceId === id).sort((left, right) => right.capturedAt.localeCompare(left.capturedAt)).map((snapshot) => snapshot));
  }

  latestChange(sourceId: string): PolicyEvidenceChange | null {
    const snapshots = this.list(sourceId);
    return snapshots.length < 2 ? null : diffPolicyEvidence(snapshots[1]!, snapshots[0]!);
  }

  recordObservation(input: PolicyEvidenceObservation): PolicyEvidenceObservation {
    const sourceId = required(input.sourceId, "sourceId", 100);
    const checkedAt = required(input.checkedAt, "checkedAt", 100);
    if (!Number.isFinite(Date.parse(checkedAt))) throw new Error("checkedAt must be an ISO date");
    if (!["unchanged", "changed", "unavailable"].includes(input.status)) throw new Error("observation status is invalid");
    if (!["first_snapshot", "content_changed", "unchanged", "check_failed"].includes(input.changeType)) throw new Error("observation changeType is invalid");
    const hash = (value: string | null, field: string) => {
      if (value !== null && !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${field} is invalid`);
      return value;
    };
    const observation = deepFreeze({
      sourceId,
      checkedAt,
      status: input.status,
      changeType: input.changeType,
      beforeHash: hash(input.beforeHash, "beforeHash"),
      afterHash: hash(input.afterHash, "afterHash"),
      ...(input.error ? { error: required(input.error, "error", 300) } : {}),
    });
    this.#observations = [...this.#observations, observation]
      .sort((left, right) => left.checkedAt.localeCompare(right.checkedAt))
      .filter((item, _index, all) => all.filter(({ sourceId: id }) => id === item.sourceId).slice(-this.retentionPerSource).includes(item));
    this.#persist();
    return observation;
  }

  observations(sourceId?: string, limit = 100): readonly PolicyEvidenceObservation[] {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) throw new Error("limit must be an integer from 1 to 1000");
    const id = sourceId === undefined ? undefined : required(sourceId, "sourceId", 100);
    return deepFreeze(this.#observations.filter((item) => id === undefined || item.sourceId === id).sort((left, right) => right.checkedAt.localeCompare(left.checkedAt)).slice(0, limit).map((item) => ({ ...item })));
  }

  #read(path: string): { snapshots: PolicyEvidenceSnapshot[]; observations: PolicyEvidenceObservation[] } {
    if (!existsSync(path)) return { snapshots: [], observations: [] };
    let parsed: StoredDocument;
    try { parsed = JSON.parse(readFileSync(path, "utf8")) as StoredDocument; } catch { throw new Error("policy evidence store is not valid JSON"); }
    if (!parsed || ![1, 2].includes(parsed.version) || !Array.isArray(parsed.snapshots)) throw new Error("policy evidence store has an unsupported format");
    const snapshots = parsed.snapshots.map((snapshot, index) => {
      try { return validateStoredSnapshot(snapshot); } catch { throw new Error(`policy evidence snapshot ${index} failed hash verification`); }
    });
    const observations = (parsed.observations ?? []).map((item) => ({ ...item }));
    return { snapshots, observations };
  }

  #persist(): void {
    if (this.path === null) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.tmp`;
    writeFileSync(temporary, JSON.stringify({ version: 2, snapshots: this.#snapshots, observations: this.#observations } satisfies StoredDocument), { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, this.path);
  }
}
