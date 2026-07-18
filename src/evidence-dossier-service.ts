import { fetchResult } from "./connectors.js";
import { buildEducationLedger } from "./education-ledger.js";
import { buildEvidenceDossier, type EvidenceDossierInput, type EvidenceDossierTemplate, type EvidencePillar, type EvidencePillarId } from "./evidence-dossier.js";
import { loadHealthFacilitiesAtlas } from "./health-facilities-service.js";
import { loadHealthIndicators } from "./health-indicators-service.js";
import { buildIndustryAtlas } from "./industry-atlas.js";
import { REGISTRY, citation } from "./sources.js";
import { buildTaxServiceReport } from "./tax-services.js";

type Fetcher = typeof fetchResult;
type Language = "en" | "ar";

export interface EvidenceDossierOptions {
  template?: EvidenceDossierTemplate;
  question?: string;
  language?: Language;
  healthFacilitiesLimit?: number;
  healthIndicatorsLimit?: number;
  industryLimit?: number;
  emirate?: string;
  query?: string;
  pillars?: readonly EvidencePillarId[];
}

export interface EvidenceDossierDependencies {
  fetchHealthFacilitiesRecords?: Fetcher;
  fetchHealthIndicatorsRecords?: Fetcher;
  fetchIndustryRecords?: Fetcher;
  fetchTaxRecords?: Fetcher;
}

const localized = (en: string, ar: string) => ({ en, ar });
const cap = (value: number | undefined, fallback: number, maximum: number) => Math.max(1, Math.min(value ?? fallback, maximum));
const bilingualLimitations = (items: readonly string[], arabic: readonly string[]) => items.map((item, index) => localized(item, arabic[index] ?? "يجب تفسير هذا الدليل داخل نطاق المصدر المنشور وحدوده فقط."));

function educationPillar(): EvidencePillar {
  const data = buildEducationLedger();
  return {
    id: "education",
    title: data.title,
    fact: localized(`${data.snapshot.generalEducation.total.toLocaleString("en-US")} general-education students were published for ${data.period}.`, `نُشر ${data.snapshot.generalEducation.total.toLocaleString("en-US")} طالبًا في التعليم العام للفترة ${data.period}.`),
    period: data.period,
    unit: localized("published national education snapshot", "لقطة وطنية منشورة للتعليم"),
    scope: localized("National published totals retained with report SHA-256.", "إجماليات وطنية منشورة محفوظة مع بصمة SHA-256 للتقرير."),
    sourceIds: ["fcsc_unified_uae_numbers_2025"],
    citation: data.source.citation,
    fetchedAt: `${data.source.retrievedAt}T00:00:00Z`,
    delivery: "verified_snapshot",
    limitations: bilingualLimitations(data.limitations, [
      "لا تُدمج اللقطة الوطنية مع موارد الكتالوج السبعة للفترة 2018–2024 لاختلاف شكل النشر ونطاق الدليل.",
      "نسبة الطلبة إلى الكوادر التعليمية نسبة وطنية مشتقة وليست حجم الفصل أو نسبة الطلبة إلى المعلمين.",
      "التقرير المحتفظ به لقطة موثقة وليس تغذية لحظية للتسجيل.",
      "تثبت حالة الكتالوج بيانات النشر الوصفية فقط ولا تثبت أن كل تنزيل قديم متاح حاليًا.",
    ]),
  };
}

async function healthFacilitiesPillar(fetcher: Fetcher, rowLimit: number, query?: string): Promise<EvidencePillar> {
  const loaded = await loadHealthFacilitiesAtlas(fetcher, { rowLimit, query });
  const data = loaded.data;
  return {
    id: "health_facilities",
    title: data.title,
    fact: localized(`${data.scope.publishedFacilityCount.toLocaleString("en-US")} published aggregate facility count for ${data.scope.selectedYear}.`, `${data.scope.publishedFacilityCount.toLocaleString("en-US")} هو العدد المجمع المنشور للمنشآت لعام ${data.scope.selectedYear}.`),
    period: String(data.scope.selectedYear),
    unit: localized("published aggregate facility count", "عدد مجمع منشور للمنشآت"),
    scope: localized(`${data.scope.matchedRows} aggregate source rows after filters.`, `${data.scope.matchedRows} صفًا مجمعًا من المصدر بعد التصفية.`),
    sourceIds: [String(loaded.meta.source_id)],
    citation: String(loaded.meta.citation),
    fetchedAt: String(loaded.meta.fetched_at),
    delivery: loaded.meta.delivery === "verified_snapshot" ? "verified_snapshot" : "live",
    limitations: bilingualLimitations(data.limitations, [
      "الصفوف ملاحظات مجمعة وليست منشآت صحية فردية.",
      "الإحداثيات المتكررة نقاط مرجعية للإمارة وليست مواقع منشآت.",
      "لا تقيس الأعداد الأسرّة أو الكوادر أو المرضى أو الطاقة الاستيعابية أو الوصول أو الجودة أو النتائج الصحية.",
      "تتعارض البيانات الوصفية القديمة مع وجود صفوف 2023 و2024، ويظل هذا التعارض ظاهرًا.",
      "لا يُنسب الفرق بين السنوات إلى افتتاحات أو إغلاقات أو سياسات أو أداء.",
    ]),
  };
}

async function healthIndicatorsPillar(fetcher: Fetcher, limit: number, query?: string): Promise<EvidencePillar> {
  const loaded = await loadHealthIndicators(fetcher, { limit, query });
  const data = loaded.report;
  const first = data.indicators[0];
  const latestFlags = first?.quality?.flags.filter((flag) => flag.years.includes(first.latest.year)) ?? [];
  const flaggedLatest = latestFlags.length > 0;
  const qualityLimitations = flaggedLatest && first ? [localized(
    `The raw ${first.latest.year} value ${first.latest.value} for ${first.name} is flagged as a relative outlier or scale inconsistency; verify the official source before interpretation.`,
    `القيمة الخام ${first.latest.value} لعام ${first.latest.year} للمؤشر ${first.name} مُعلّمة كقيمة شاذة نسبيًا أو عدم اتساق في المقياس؛ يجب مراجعة المصدر الرسمي قبل التفسير.`,
  )] : [];
  return {
    id: "health_indicators",
    title: data.title,
    fact: first
      ? flaggedLatest
        ? localized(`${first.name}: ${first.latest.value} (${first.latest.year}), raw source value — QUALITY WARNING: flagged for verification before interpretation.`, `${first.name}: ${first.latest.value} (${first.latest.year}) قيمة خام من المصدر — تحذير جودة: مُعلّمة للمراجعة قبل التفسير.`)
        : localized(`${first.name}: ${first.latest.value} (${first.latest.year}), preserved on its source-native scale.`, `${first.name}: ${first.latest.value} (${first.latest.year}) بالقيمة الأصلية المنشورة.`)
      : localized("No indicator matched the bounded request.", "لم يطابق أي مؤشر الطلب المحدود."),
    period: data.scope.years.length ? `${data.scope.years[0]}–${data.scope.years.at(-1)}` : null,
    unit: localized("source-native indicator row", "صف مؤشر بقيمته الأصلية"),
    scope: localized(`${data.scope.returnedIndicators} of ${data.scope.matchedIndicators} matched indicators returned.`, `أُعيد ${data.scope.returnedIndicators} من ${data.scope.matchedIndicators} مؤشرًا مطابقًا.`),
    sourceIds: [String(loaded.meta.source_id)],
    citation: String(loaded.meta.citation),
    fetchedAt: String(loaded.meta.fetched_at),
    delivery: loaded.meta.delivery === "verified_snapshot" ? "verified_snapshot" : "live",
    limitations: [...qualityLimitations, ...bilingualLimitations(data.limitations, [
      "القيم محفوظة بمقاييس المصدر الأصلية، وقد تختلف النسب والقيم المئوية بين المؤشرات أو السنوات.",
      "الملف منشور كتقرير 2024، بينما تنتهي أعمدة السلسلة الزمنية الظاهرة حاليًا في 2023.",
      "لا تستنتج المنصة السببية أو الأهداف الوطنية أو التحسن أو التدهور من هذه الصفوف.",
      "تعذّر المصدر الحي لوزارة الصحة في هذا الطلب؛ تستخدم الاستجابة النسخة الموثقة المحفوظة والمحددة ببصمة SHA-256 للمصدر.",
    ])],
    ...(flaggedLatest ? { quality: { status: "warning" as const, flags: latestFlags.map(({ code, years }) => ({ code, years })) } } : {}),
  };
}

async function industryPillar(fetcher: Fetcher, limit: number, emirate?: string, query?: string): Promise<EvidencePillar> {
  const source = REGISTRY.get("moiat_industrial_licenses");
  const result = await fetcher(source, { limit });
  const data = buildIndustryAtlas(result.records, { sourceId: source.id, citation: result.citation, fetchedAt: result.fetched_at, upstreamTotal: result.total, qualityScore: result.data_quality.quality_score, emirate, query });
  return {
    id: "industry", title: localized("UAE Industry Evidence", "أدلة الصناعة في الإمارات"),
    fact: localized(`${data.scope.sampleSize} industrial-establishment records matched the bounded sample.`, `طابق ${data.scope.sampleSize} سجل منشأة صناعية العينة المحدودة.`),
    period: null, unit: localized("bounded industrial-establishment record", "سجل منشأة صناعية ضمن عينة محدودة"),
    scope: localized(`Bounded sample; upstream total ${result.total ?? "not published"}.`, `عينة محدودة؛ إجمالي المصدر ${result.total ?? "غير منشور"}.`),
    sourceIds: [source.id], citation: result.citation, fetchedAt: result.fetched_at, delivery: "live",
    limitations: bilingualLimitations(data.limitations, [
      "تصف الأعداد العينة المعادة وليست كامل المنشآت الصناعية في الإمارات.",
      "لا يثبت سجل الترخيص أن المنشأة تعمل حاليًا.",
      "قد تتكرر مسميات المنتجات بين المنشآت ولا تمثل أحجام الإنتاج.",
      "تعتمد التغطية على الإجمالي الذي ينشره المصدر لهذا الطلب إن توفر.",
    ]),
  };
}

async function taxPillar(fetcher: Fetcher): Promise<EvidencePillar> {
  const source = REGISTRY.get("fta_service_activity_2025");
  const result = await fetcher(source, { limit: 10 });
  const data = buildTaxServiceReport(result.records, { citation: result.citation, fetchedAt: result.fetched_at });
  return {
    id: "tax_activity", title: localized("FTA Service Activity", "نشاط خدمات الهيئة الاتحادية للضرائب"),
    fact: localized(`${data.officialTotal.toLocaleString("en-US")} service activities in the FTA-published Grand Total row for 2025.`, `${data.officialTotal.toLocaleString("en-US")} نشاط خدمة في صف الإجمالي الكلي المنشور من الهيئة لعام 2025.`),
    period: data.period, unit: localized("published service-activity count", "عدد نشاط خدمات منشور"),
    scope: localized("The source-published 10-row annual table only.", "الجدول السنوي المنشور المكوّن من 10 صفوف فقط."),
    sourceIds: [source.id], citation: result.citation, fetchedAt: result.fetched_at, delivery: "live",
    limitations: bilingualLimitations(data.limitations, [
      "هذه أعداد نشاط خدمات منشورة من الهيئة وليست إيرادات ضريبية أو أعداد دافعي ضرائب أو شركات أو مقياس نمو اقتصادي.",
      "تمثل فئات الخدمات تسجيلات وتعديلات وإعادة نظر وإلغاءات وطلبات استرداد، ويجب تفسير كل فئة بشكل مستقل.",
      "لا يُستنتج سبب أو نمو اقتصادي من التغير بين الأرباع.",
    ]),
  };
}

function unavailable(id: EvidencePillarId, error: unknown): EvidencePillar {
  const sourceId = id === "health_facilities" ? "mohap_health_facilities_2024"
    : id === "health_indicators" ? "mohap_health_core_indicators_2024"
      : id === "industry" ? "moiat_industrial_licenses" : "fta_service_activity_2025";
  const source = REGISTRY.get(sourceId);
  const message = error instanceof Error ? error.message : String(error);
  return {
    id, title: localized(id.replaceAll("_", " "), id.replaceAll("_", " ")),
    fact: localized("Evidence unavailable for this request.", "الدليل غير متاح لهذا الطلب."), period: null, unit: null,
    scope: localized(`Unavailable for this request: ${message}`, `غير متاح لهذا الطلب: ${message}`),
    sourceIds: [sourceId], citation: citation(source), fetchedAt: null, delivery: "unavailable",
    limitations: [localized("No value or zero is inferred from unavailable evidence.", "لا تُستنتج أي قيمة أو صفر من الأدلة غير المتاحة.")],
  };
}

export async function loadEvidenceDossier(options: EvidenceDossierOptions = {}, dependencies: EvidenceDossierDependencies = {}) {
  const limits = {
    healthFacilities: cap(options.healthFacilitiesLimit, 50, 200),
    healthIndicators: cap(options.healthIndicatorsLimit, 12, 50),
    industry: cap(options.industryLimit, 50, 100),
  };
  const selected = [...new Set(options.pillars ?? ["education", "health_facilities", "health_indicators", "industry", "tax_activity"])] as EvidencePillarId[];
  if (selected.length < 2 || selected.length > 5) throw new Error("pillars must contain 2-5 unique evidence pillar ids");
  if (selected.some((id) => !["education", "health_facilities", "health_indicators", "industry", "tax_activity"].includes(id))) throw new Error("pillars contain an unsupported evidence pillar id");
  const tasks: Partial<Record<EvidencePillarId, () => Promise<EvidencePillar>>> = {
    health_facilities: () => healthFacilitiesPillar(dependencies.fetchHealthFacilitiesRecords ?? fetchResult, limits.healthFacilities, options.query),
    health_indicators: () => healthIndicatorsPillar(dependencies.fetchHealthIndicatorsRecords ?? fetchResult, limits.healthIndicators, options.query),
    industry: () => industryPillar(dependencies.fetchIndustryRecords ?? fetchResult, limits.industry, options.emirate, options.query),
    tax_activity: () => taxPillar(dependencies.fetchTaxRecords ?? fetchResult),
  };
  const liveIds = selected.filter((id) => id !== "education");
  const settled = await Promise.allSettled(liveIds.map((id) => tasks[id]!()));
  const loaded = settled.map((result, index) => result.status === "fulfilled" ? result.value : unavailable(liveIds[index]!, result.reason));
  const pillars: EvidencePillar[] = [...(selected.includes("education") ? [educationPillar()] : []), ...loaded];
  const input: EvidenceDossierInput = {
    template: options.template ?? "research_dossier",
    question: options.question ?? "What does the current official evidence show?",
    language: options.language ?? "en",
    pillars,
  };
  const data = buildEvidenceDossier(input);
  const unavailableCount = pillars.filter((pillar) => pillar.delivery === "unavailable").length;
  return { data, meta: { partial: unavailableCount > 0, available_pillars: pillars.length - unavailableCount, unavailable_pillars: unavailableCount, limits, filters: { emirate: options.emirate ?? null, query: options.query ?? null, pillars: selected } } };
}
