export const GOLDEN_RESIDENCY_ICP_URL = "https://icp.gov.ae/en/services/golden-residency/";
export const GOLDEN_RESIDENCY_UAE_URL = "https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa";
export const GOLDEN_RESIDENCY_DUBAI_URL = "https://www.gdrfad.gov.ae/en/services/335969f4-8045-11ed-4fe5-0050569629e8";
export const GOLDEN_RESIDENCY_ABU_DHABI_URL = "https://adro.gov.ae/Visas/Types-of-Visas/Abu-Dhabi-Golden-Visa";

type Localized = Readonly<{ en: string; ar: string }>;
export const GOLDEN_PATHWAY_IDS = ["public_investor", "real_estate_investor", "entrepreneur", "exceptional_talent", "doctor", "scientist", "inventor", "creative", "executive", "athlete", "priority_specialist", "high_school_student", "university_student", "humanitarian_frontline"] as const;
export type GoldenPathwayId = typeof GOLDEN_PATHWAY_IDS[number];

export type GoldenReadinessInput = Readonly<{
  pathway: GoldenPathwayId;
  jurisdiction?: "federal" | "dubai" | "abu_dhabi";
  capitalAed?: number;
  propertyValueAed?: number;
  annualTaxAed?: number;
  projectValueAed?: number;
  innovativeProjectEvidence?: boolean;
  incubatorRecommendation?: boolean;
  gradePercent?: number;
  universityGpa?: number;
  graduatedWithinTwoYears?: boolean;
  ministryRecommendation?: boolean;
  universityRecommendation?: boolean;
  professionalRecommendation?: boolean;
  attestedDegree?: boolean;
  fiveYearsExperience?: boolean;
  employmentContract?: boolean;
  monthlySalaryAed?: number;
  validPassportEvidence?: boolean;
  humanitarianYears?: number;
  volunteerHours?: number;
  humanitarianSupportAed?: number;
}>;

type Requirement = Readonly<{ id: string; label: Localized; evidence: Localized }>;
type Pathway = Readonly<{
  id: string; title: Localized; durationYears: readonly number[]; summary: Localized;
  requirements: readonly Requirement[]; officialUrl: string;
}>;

const pathways: readonly Pathway[] = Object.freeze([
  {
    id: "investors", title: { en: "Public & real-estate investors", ar: "مستثمرو الاستثمارات العامة والعقار" }, durationYears: [5, 10],
    summary: { en: "Public investment routes are generally 10 years; the real-estate route is generally 5 years.", ar: "مسارات الاستثمار العام مدتها المعتادة 10 سنوات، ومسار الاستثمار العقاري 5 سنوات." },
    requirements: [
      { id: "capital", label: { en: "AED 2m qualifying capital or property", ar: "رأس مال أو عقار مؤهل بقيمة مليوني درهم" }, evidence: { en: "Official fund, company, tax or land-registration letter, depending on route.", ar: "خطاب رسمي من صندوق أو شركة أو جهة ضريبية أو تسجيل عقاري حسب المسار." } },
      { id: "tax", label: { en: "Alternative public-investment tax route", ar: "مسار ضريبي بديل للاستثمار العام" }, evidence: { en: "FTA letter confirming at least AED 250,000 annual tax.", ar: "خطاب من الهيئة الاتحادية للضرائب يثبت سداد 250 ألف درهم سنويًا على الأقل." } },
    ], officialUrl: GOLDEN_RESIDENCY_ICP_URL,
  },
  {
    id: "entrepreneurs", title: { en: "Entrepreneurs", ar: "رواد الأعمال" }, durationYears: [5],
    summary: { en: "For innovative, technical or future-facing projects supported by competent authorities.", ar: "للمشروعات الابتكارية أو التقنية أو المستقبلية المدعومة من الجهات المختصة." },
    requirements: [
      { id: "project_value", label: { en: "Project value of at least AED 500,000", ar: "قيمة مشروع لا تقل عن 500 ألف درهم" }, evidence: { en: "Letter from an auditor.", ar: "خطاب من مدقق حسابات." } },
      { id: "incubator_recommendation", label: { en: "Innovation and incubator/authority support", ar: "إثبات الابتكار ودعم حاضنة أو جهة مختصة" }, evidence: { en: "Letter from a competent authority or accredited incubator.", ar: "خطاب من جهة مختصة أو حاضنة أعمال معتمدة." } },
    ], officialUrl: GOLDEN_RESIDENCY_ICP_URL,
  },
  {
    id: "talents", title: { en: "Exceptional talents & rare specializations", ar: "أصحاب المواهب والتخصصات النادرة" }, durationYears: [10],
    summary: { en: "Doctors, scientists, inventors, creatives, executives, athletes, PhD holders and priority specialists have category-specific evidence.", ar: "للأطباء والعلماء والمخترعين والمبدعين والمديرين والرياضيين وحملة الدكتوراه والمتخصصين أدلة خاصة بكل فئة." },
    requirements: [{ id: "professional_recommendation", label: { en: "Approval or recommendation from the competent body", ar: "اعتماد أو توصية من الجهة المختصة" }, evidence: { en: "The issuing authority depends on the profession or achievement.", ar: "تختلف جهة الإصدار حسب المهنة أو الإنجاز." } }], officialUrl: GOLDEN_RESIDENCY_ICP_URL,
  },
  {
    id: "students", title: { en: "Outstanding students", ar: "الطلاب النابغون" }, durationYears: [5, 10],
    summary: { en: "High-school and accredited-university routes have separate thresholds and recommendations.", ar: "للثانوية والجامعات المعتمدة حدود وتوصيات منفصلة." },
    requirements: [
      { id: "school_grade", label: { en: "High school: at least 95%", ar: "الثانوية: 95% على الأقل" }, evidence: { en: "Ministry of Education recommendation and proof of achievement.", ar: "توصية وزارة التربية والتعليم وإثبات التفوق." } },
      { id: "university_gpa", label: { en: "University: GPA at least 3.8 and within two years of graduation", ar: "الجامعة: معدل 3.8 على الأقل وخلال عامين من التخرج" }, evidence: { en: "University recommendation or graduation certificate.", ar: "توصية الجامعة أو شهادة التخرج." } },
    ], officialUrl: GOLDEN_RESIDENCY_ICP_URL,
  },
  {
    id: "humanitarian", title: { en: "Humanitarian pioneers & frontline workers", ar: "رواد العمل الإنساني وخط الدفاع الأول" }, durationYears: [10],
    summary: { en: "Documented exceptional contribution, service, volunteering or qualifying financial support is reviewed by the competent authority.", ar: "تراجع الجهة المختصة المساهمات الاستثنائية الموثقة أو الخدمة أو التطوع أو الدعم المالي المؤهل." },
    requirements: [{ id: "humanitarian_evidence", label: { en: "5 years, 500 volunteer hours, or AED 2m support", ar: "5 سنوات أو 500 ساعة تطوع أو دعم بمليوني درهم" }, evidence: { en: "Official certificates and supporting records.", ar: "شهادات رسمية وسجلات داعمة." } }], officialUrl: GOLDEN_RESIDENCY_ICP_URL,
  },
]);

const talentVariants = Object.freeze([
  { id: "doctor", title: { en: "Doctors", ar: "الأطباء" }, evidence: { en: "Approval letter from the health authority to practise the profession.", ar: "خطاب اعتماد من الجهة الصحية لمزاولة المهنة." } },
  { id: "scientist", title: { en: "Scientists", ar: "العلماء" }, evidence: { en: "Recommendation from the Emirates Scientists Council or a scientific excellence award.", ar: "توصية من مجلس علماء الإمارات أو جائزة للتميز العلمي." } },
  { id: "inventor", title: { en: "Inventors", ar: "المخترعون" }, evidence: { en: "Recommendation from the Ministry of Economy.", ar: "توصية من وزارة الاقتصاد." } },
  { id: "creative", title: { en: "Culture & arts creatives", ar: "المبدعون في الثقافة والفنون" }, evidence: { en: "Approval from the Ministry of Culture or the competent culture and arts authority.", ar: "اعتماد من وزارة الثقافة أو الجهة المختصة بالثقافة والفنون." } },
  { id: "executive", title: { en: "Executives", ar: "المديرون التنفيذيون" }, evidence: { en: "Attested degree, five years of experience, employment contract and salary certificate of at least AED 50,000.", ar: "شهادة جامعية مصدقة وخبرة خمس سنوات وعقد عمل وشهادة راتب لا تقل عن 50 ألف درهم." } },
  { id: "athlete", title: { en: "Athletes", ar: "الرياضيون" }, evidence: { en: "Recommendation from the General Sports Authority or a sports council.", ar: "توصية من الهيئة العامة للرياضة أو أحد المجالس الرياضية." } },
  { id: "priority_specialist", title: { en: "Priority scientific & engineering specialists", ar: "متخصصو المجالات العلمية والهندسية ذات الأولوية" }, evidence: { en: "Attested PhD or university degree, employment contract and passport evidence.", ar: "دكتوراه أو شهادة جامعية مصدقة وعقد عمل وإثبات جواز السفر." } },
]);

export function goldenResidencyCatalogue() {
  return {
    kind: "uae_golden_residency_navigator" as const,
    verifiedAt: "2026-07-17" as const,
    pathways: pathways.map((item) => ({ ...item, title: { ...item.title }, summary: { ...item.summary }, durationYears: [...item.durationYears], requirements: item.requirements.map((requirement) => ({ ...requirement, label: { ...requirement.label }, evidence: { ...requirement.evidence } })) })),
    talentVariants: talentVariants.map((item) => ({ ...item, title: { ...item.title }, evidence: { ...item.evidence } })),
    authorities: [
      { jurisdiction: { en: "UAE except Dubai", ar: "جميع الإمارات باستثناء دبي" }, authority: { en: "ICP", ar: "الهيئة الاتحادية للهوية والجنسية" }, url: GOLDEN_RESIDENCY_ICP_URL },
      { jurisdiction: { en: "Dubai", ar: "دبي" }, authority: { en: "GDRFA Dubai", ar: "الإدارة العامة للهوية وشؤون الأجانب – دبي" }, url: GOLDEN_RESIDENCY_DUBAI_URL },
      { jurisdiction: { en: "Abu Dhabi", ar: "أبوظبي" }, authority: { en: "Abu Dhabi Residents Office", ar: "مكتب أبوظبي للمقيمين" }, url: GOLDEN_RESIDENCY_ABU_DHABI_URL },
    ],
    sources: [
      { publisher: "Federal Authority for Identity, Citizenship, Customs & Port Security", url: GOLDEN_RESIDENCY_ICP_URL },
      { publisher: "The Official Platform of the UAE Government", url: GOLDEN_RESIDENCY_UAE_URL },
      { publisher: "General Directorate of Identity and Foreigners Affairs — Dubai", url: GOLDEN_RESIDENCY_DUBAI_URL },
      { publisher: "Abu Dhabi Residents Office", url: GOLDEN_RESIDENCY_ABU_DHABI_URL },
    ],
    disclaimer: {
      en: "This is an informational readiness navigator, not an eligibility decision, legal advice, application or approval guarantee. The competent government authority makes the final decision.",
      ar: "هذا دليل معلوماتي للجاهزية وليس قرار أهلية أو استشارة قانونية أو طلبًا أو ضمان موافقة. القرار النهائي للجهة الحكومية المختصة.",
    },
  };
}

const threshold = (value: number | undefined, minimum: number, matched: string[], missing: string[], id: string) => {
  if (value === undefined) return;
  (value >= minimum ? matched : missing).push(id);
};
const flag = (value: boolean | undefined, matched: string[], missing: string[], id: string) => {
  if (value === undefined) return;
  (value ? matched : missing).push(id);
};

export function assessGoldenResidencyReadiness(input: GoldenReadinessInput) {
  const matched: string[] = [];
  const missing: string[] = [];
  switch (input.pathway) {
    case "public_investor": {
      const supplied = input.capitalAed !== undefined || input.annualTaxAed !== undefined;
      if (supplied) ((input.capitalAed ?? 0) >= 2_000_000 || (input.annualTaxAed ?? 0) >= 250_000 ? matched : missing).push("capital_or_tax");
      break;
    }
    case "real_estate_investor": threshold(input.propertyValueAed, 2_000_000, matched, missing, "property_value"); break;
    case "entrepreneur": threshold(input.projectValueAed, 500_000, matched, missing, "project_value"); flag(input.innovativeProjectEvidence, matched, missing, "innovation_evidence"); flag(input.incubatorRecommendation, matched, missing, "incubator_recommendation"); break;
    case "exceptional_talent": flag(input.professionalRecommendation, matched, missing, "professional_recommendation"); break;
    case "doctor": flag(input.professionalRecommendation, matched, missing, "doctor_approval"); break;
    case "scientist": flag(input.professionalRecommendation, matched, missing, "scientist_recommendation"); break;
    case "inventor": flag(input.professionalRecommendation, matched, missing, "inventor_recommendation"); break;
    case "creative": flag(input.professionalRecommendation, matched, missing, "creative_approval"); break;
    case "athlete": flag(input.professionalRecommendation, matched, missing, "athlete_recommendation"); break;
    case "executive":
      flag(input.attestedDegree, matched, missing, "attested_degree");
      flag(input.fiveYearsExperience, matched, missing, "executive_experience");
      flag(input.employmentContract, matched, missing, "employment_contract");
      threshold(input.monthlySalaryAed, 50_000, matched, missing, "executive_salary");
      break;
    case "priority_specialist":
      flag(input.attestedDegree, matched, missing, "attested_degree");
      flag(input.employmentContract, matched, missing, "employment_contract");
      flag(input.validPassportEvidence, matched, missing, "passport_evidence");
      break;
    case "high_school_student": threshold(input.gradePercent, 95, matched, missing, "school_grade"); flag(input.ministryRecommendation, matched, missing, "ministry_recommendation"); break;
    case "university_student": threshold(input.universityGpa, 3.8, matched, missing, "university_gpa"); flag(input.graduatedWithinTwoYears, matched, missing, "graduation_recency"); flag(input.universityRecommendation, matched, missing, "university_recommendation"); break;
    case "humanitarian_frontline": {
      const evidence = (input.humanitarianYears ?? 0) >= 5 || (input.volunteerHours ?? 0) >= 500 || (input.humanitarianSupportAed ?? 0) >= 2_000_000;
      const supplied = input.humanitarianYears !== undefined || input.volunteerHours !== undefined || input.humanitarianSupportAed !== undefined;
      if (supplied) (evidence ? matched : missing).push("humanitarian_evidence");
    }
  }
  const evidenceLabels: Record<string, Localized> = {
    capital_or_tax: { en: "Qualifying public capital or annual tax evidence", ar: "إثبات رأس المال العام المؤهل أو الضريبة السنوية" },
    property_value: { en: "Property value of at least AED 2 million", ar: "قيمة عقارية لا تقل عن مليوني درهم" },
    project_value: { en: "Project value of at least AED 500,000", ar: "قيمة مشروع لا تقل عن 500 ألف درهم" },
    innovation_evidence: { en: "Innovation or future-project evidence", ar: "إثبات مشروع ابتكاري أو مستقبلي" },
    incubator_recommendation: { en: "Accredited incubator or authority recommendation", ar: "توصية حاضنة معتمدة أو جهة مختصة" },
    professional_recommendation: { en: "Competent-body approval or recommendation", ar: "اعتماد أو توصية الجهة المختصة" },
    doctor_approval: { en: "Health-authority approval to practise medicine", ar: "اعتماد الجهة الصحية لمزاولة مهنة الطب" },
    scientist_recommendation: { en: "Emirates Scientists Council recommendation or scientific excellence award", ar: "توصية مجلس علماء الإمارات أو جائزة التميز العلمي" },
    inventor_recommendation: { en: "Ministry of Economy recommendation", ar: "توصية وزارة الاقتصاد" },
    creative_approval: { en: "Culture authority approval", ar: "اعتماد الجهة المختصة بالثقافة والفنون" },
    athlete_recommendation: { en: "General Sports Authority or sports-council recommendation", ar: "توصية الهيئة العامة للرياضة أو مجلس رياضي" },
    attested_degree: { en: "Attested university degree", ar: "شهادة جامعية مصدقة" },
    executive_experience: { en: "At least five years of executive experience", ar: "خبرة تنفيذية لا تقل عن خمس سنوات" },
    employment_contract: { en: "Current employment contract", ar: "عقد عمل حالي" },
    executive_salary: { en: "Monthly salary certificate of at least AED 50,000", ar: "شهادة راتب شهري لا يقل عن 50 ألف درهم" },
    passport_evidence: { en: "Valid passport copy available for official submission", ar: "نسخة جواز سفر ساري متاحة للتقديم الرسمي" },
    school_grade: { en: "High-school grade of at least 95%", ar: "نتيجة ثانوية لا تقل عن 95%" },
    ministry_recommendation: { en: "Ministry of Education recommendation", ar: "توصية وزارة التربية والتعليم" },
    university_gpa: { en: "University GPA of at least 3.8", ar: "معدل جامعي لا يقل عن 3.8" },
    graduation_recency: { en: "Graduation within the last two years", ar: "التخرج خلال العامين الماضيين" },
    university_recommendation: { en: "University recommendation or graduation certificate", ar: "توصية الجامعة أو شهادة التخرج" },
    humanitarian_evidence: { en: "Qualifying humanitarian service, hours or financial support", ar: "خدمة أو ساعات تطوع أو دعم مالي إنساني مؤهل" },
  };
  const jurisdiction = input.jurisdiction ?? "federal";
  const nextSteps = {
    federal: { authority: "icp", label: { en: "Continue with ICP", ar: "تابع عبر الهيئة الاتحادية" }, url: GOLDEN_RESIDENCY_ICP_URL },
    dubai: { authority: "gdrfa_dubai", label: { en: "Open GDRFA Dubai Golden Residency", ar: "افتح الإقامة الذهبية لدى إقامة دبي" }, url: GOLDEN_RESIDENCY_DUBAI_URL },
    abu_dhabi: { authority: "adro_abu_dhabi", label: { en: "Open Abu Dhabi Residents Office", ar: "افتح مكتب أبوظبي للمقيمين" }, url: GOLDEN_RESIDENCY_ABU_DHABI_URL },
  } as const;
  const localCriteriaNotEvaluated = jurisdiction !== "federal";
  const routingNotice = localCriteriaNotEvaluated
    ? {
        en: "This dossier compares the UAE federal baseline only. Dubai and Abu Dhabi may publish local category criteria or nomination steps; verify them on the selected official portal before applying.",
        ar: "يقارن هذا الملف خط الأساس الاتحادي فقط. قد تنشر دبي وأبوظبي متطلبات محلية أو خطوات ترشيح خاصة بالفئة؛ راجعها في البوابة الرسمية المختارة قبل التقديم.",
      }
    : {
        en: "Verify the current category evidence on ICP before applying; the competent authority makes the final decision.",
        ar: "راجع أدلة الفئة الحالية عبر الهيئة الاتحادية قبل التقديم؛ القرار النهائي للجهة المختصة.",
      };
  const evidenceCount = matched.length + missing.length;
  return {
    kind: "uae_golden_residency_readiness" as const,
    pathway: input.pathway,
    status: (matched.length === 0 && missing.length === 0 ? "not_enough_information" : matched.length > 0 ? "potential_match" : "needs_official_review") as "not_enough_information" | "potential_match" | "needs_official_review",
    matched, missing,
    matchedEvidence: matched.map((id) => ({ id, label: evidenceLabels[id] })),
    missingEvidence: missing.map((id) => ({ id, label: evidenceLabels[id] })),
    dossier: {
      completion: evidenceCount === 0 ? null : Math.round((matched.length / evidenceCount) * 100) / 100,
      evidenceCount,
      matchedCount: matched.length,
      missingCount: missing.length,
      officialReviewRequired: true as const,
      storesPersonalData: false as const,
    },
    decision: "informational_only" as const,
    criteria: { scope: "federal_baseline" as const, localCriteriaNotEvaluated },
    nextStep: { jurisdiction, ...nextSteps[jurisdiction], notice: routingNotice },
    disclaimer: goldenResidencyCatalogue().disclaimer,
  };
}
