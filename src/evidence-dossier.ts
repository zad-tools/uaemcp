export const EVIDENCE_DOSSIER_TEMPLATES = ["evidence_brief", "research_dossier", "source_comparison"] as const;
export const EVIDENCE_PILLAR_IDS = ["education", "health_facilities", "health_indicators", "industry", "tax_activity"] as const;
export const EVIDENCE_DELIVERY_MODES = ["live", "verified_snapshot", "static_catalogue", "unavailable"] as const;

export type EvidenceDossierLanguage = "en" | "ar";
export type EvidenceDossierTemplate = typeof EVIDENCE_DOSSIER_TEMPLATES[number];
export type EvidencePillarId = typeof EVIDENCE_PILLAR_IDS[number];
export type EvidenceDelivery = typeof EVIDENCE_DELIVERY_MODES[number];
export type LocalizedEvidenceText = Readonly<{ en: string; ar: string }>;

export type EvidencePillar = Readonly<{
  id: EvidencePillarId;
  title: LocalizedEvidenceText;
  fact: LocalizedEvidenceText;
  period: string | null;
  unit: LocalizedEvidenceText | null;
  scope: LocalizedEvidenceText;
  sourceIds: readonly string[];
  citation: string;
  fetchedAt: string | null;
  delivery: EvidenceDelivery;
  limitations: readonly LocalizedEvidenceText[];
}>;

export type EvidenceDossierInput = Readonly<{
  template: EvidenceDossierTemplate;
  question: string;
  language: EvidenceDossierLanguage;
  pillars: readonly EvidencePillar[];
  methodology?: readonly LocalizedEvidenceText[];
  limitations?: readonly LocalizedEvidenceText[];
}>;

export type EvidenceDossier = Readonly<{
  kind: "uae_evidence_dossier";
  generatedAt: string | null;
  template: EvidenceDossierTemplate;
  question: string;
  language: EvidenceDossierLanguage;
  scope: Readonly<{
    pillarsRequested: number;
    pillarsAvailable: number;
    pillarsUnavailable: number;
  }>;
  pillars: readonly EvidencePillar[];
  evidence: readonly EvidencePillar[];
  unavailable: readonly (EvidencePillar & Readonly<{ reason: LocalizedEvidenceText }>)[];
  citations: readonly string[];
  methodology: Readonly<{
    operation: "side_by_side_source_native_evidence";
    crossEvidenceAggregation: false;
    compositeScore: false;
    ranking: false;
    notes: readonly LocalizedEvidenceText[];
  }>;
  limitations: readonly LocalizedEvidenceText[];
}>;

const POLICY_LIMITATIONS: readonly LocalizedEvidenceText[] = [
  {
    en: "Evidence from different sources, periods, units and scopes must not be added, ranked or converted into a composite score.",
    ar: "لا يجوز جمع الأدلة من مصادر وفترات ووحدات ونطاقات مختلفة أو ترتيبها أو تحويلها إلى درجة مركبة.",
  },
  {
    en: "Unavailable evidence is reported explicitly and is never represented as zero.",
    ar: "يُعرض الدليل غير المتاح بوضوح ولا يُمثّل أبدًا بقيمة صفرية.",
  },
] as const;

function assertText(value: unknown, field: string, maximum = 500): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maximum) {
    throw new Error(`${field} must contain 1-${maximum} characters`);
  }
}

function localized(value: LocalizedEvidenceText, field: string): LocalizedEvidenceText {
  if (!value || typeof value !== "object") throw new Error(`${field} must be bilingual`);
  assertText(value.en, `${field}.en`);
  assertText(value.ar, `${field}.ar`);
  return { en: value.en.trim(), ar: value.ar.trim() };
}

function localizedList(values: readonly LocalizedEvidenceText[] | undefined, field: string): LocalizedEvidenceText[] {
  if (values === undefined) return [];
  if (!Array.isArray(values)) throw new Error(`${field} must be an array`);
  const seen = new Set<string>();
  return values.flatMap((value, index) => {
    const copy = localized(value, `${field}[${index}]`);
    const key = `${copy.en}\u0000${copy.ar}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [copy];
  });
}

function copyPillar(pillar: EvidencePillar, index: number): EvidencePillar {
  if (!pillar || typeof pillar !== "object") throw new Error(`pillars[${index}] must be an object`);
  if (!EVIDENCE_PILLAR_IDS.includes(pillar.id)) throw new Error(`pillars[${index}].id is invalid`);
  if (!EVIDENCE_DELIVERY_MODES.includes(pillar.delivery)) throw new Error(`pillars[${index}].delivery is invalid`);
  if (!Array.isArray(pillar.sourceIds) || pillar.sourceIds.length === 0) throw new Error(`pillars[${index}].sourceIds must not be empty`);
  const sourceIds = pillar.sourceIds.map((sourceId, sourceIndex) => {
    assertText(sourceId, `pillars[${index}].sourceIds[${sourceIndex}]`, 100);
    return sourceId.trim();
  });
  if (new Set(sourceIds).size !== sourceIds.length) throw new Error(`pillars[${index}].sourceIds must be unique`);
  assertText(pillar.citation, `pillars[${index}].citation`, 2_000);
  let citation: URL;
  try { citation = new URL(pillar.citation); } catch { throw new Error(`pillars[${index}].citation must be an HTTPS URL`); }
  if (citation.protocol !== "https:") throw new Error(`pillars[${index}].citation must be an HTTPS URL`);
  if (pillar.period !== null) assertText(pillar.period, `pillars[${index}].period`, 100);
  if (pillar.fetchedAt !== null && !Number.isFinite(Date.parse(pillar.fetchedAt))) throw new Error(`pillars[${index}].fetchedAt must be an ISO date or null`);

  return {
    id: pillar.id,
    title: localized(pillar.title, `pillars[${index}].title`),
    fact: localized(pillar.fact, `pillars[${index}].fact`),
    period: pillar.period?.trim() ?? null,
    unit: pillar.unit === null ? null : localized(pillar.unit, `pillars[${index}].unit`),
    scope: localized(pillar.scope, `pillars[${index}].scope`),
    sourceIds,
    citation: citation.href,
    fetchedAt: pillar.fetchedAt,
    delivery: pillar.delivery,
    limitations: localizedList(pillar.limitations, `pillars[${index}].limitations`),
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function buildEvidenceDossier(input: EvidenceDossierInput): EvidenceDossier {
  if (!input || typeof input !== "object") throw new Error("input must be an object");
  const unsafe = input as EvidenceDossierInput & { compositeScore?: unknown; ranking?: unknown; rank?: unknown };
  if (unsafe.compositeScore !== undefined || unsafe.ranking !== undefined || unsafe.rank !== undefined) {
    throw new Error("composite or ranking calculation is not accepted");
  }
  assertText(input.question, "question", 200);
  if (!(["en", "ar"] as const).includes(input.language)) throw new Error("language must be en or ar");
  if (!EVIDENCE_DOSSIER_TEMPLATES.includes(input.template)) throw new Error("template is invalid");
  if (!Array.isArray(input.pillars) || input.pillars.length === 0 || input.pillars.length > EVIDENCE_PILLAR_IDS.length) {
    throw new Error(`pillars must contain 1-${EVIDENCE_PILLAR_IDS.length} entries`);
  }

  const pillars = input.pillars.map(copyPillar);
  if (new Set(pillars.map(({ id }) => id)).size !== pillars.length) throw new Error("pillar ids must be unique");
  const order = new Map(EVIDENCE_PILLAR_IDS.map((id, index) => [id, index]));
  pillars.sort((left, right) => order.get(left.id)! - order.get(right.id)!);
  const unavailablePillars = pillars.filter(({ delivery }) => delivery === "unavailable");
  const availablePillars = pillars.filter(({ delivery }) => delivery !== "unavailable");
  const generatedAt = pillars.flatMap(({ fetchedAt }) => fetchedAt ? [fetchedAt] : []).sort().at(-1) ?? null;
  const citations = [...new Set(pillars.map(({ citation }) => citation))];
  const methodology = localizedList(input.methodology, "methodology");
  const limitations = localizedList([...(input.limitations ?? []), ...pillars.flatMap(({ limitations: values }) => values), ...POLICY_LIMITATIONS], "limitations");

  return deepFreeze({
    kind: "uae_evidence_dossier",
    generatedAt,
    template: input.template,
    question: input.question.trim(),
    language: input.language,
    scope: { pillarsRequested: pillars.length, pillarsAvailable: availablePillars.length, pillarsUnavailable: unavailablePillars.length },
    pillars,
    evidence: availablePillars,
    unavailable: unavailablePillars.map((pillar) => ({ ...pillar, reason: { ...pillar.fact } })),
    citations,
    methodology: {
      operation: "side_by_side_source_native_evidence",
      crossEvidenceAggregation: false,
      compositeScore: false,
      ranking: false,
      notes: methodology,
    },
    limitations,
  });
}
