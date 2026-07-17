import { routeBusinessSetup, type BusinessActivitySector, type BusinessEmirate, type BusinessSetupType } from "./business-setup.js";
import { assessGoldenResidencyReadiness } from "./golden-residency.js";
import { matchStartupSupport, type StartupStage, type StartupSupportType } from "./startup-support.js";

export type FounderPathwayInput = Readonly<{
  stage: StartupStage;
  emirate: BusinessEmirate;
  setupType: BusinessSetupType;
  supportType: StartupSupportType;
  activitySector?: BusinessActivitySector;
}>;

const localSupportEmirates = new Set(["abu_dhabi", "dubai", "sharjah", "ajman"]);

export function buildFounderPathway(input: FounderPathwayInput) {
  const setup = routeBusinessSetup({ emirate: input.emirate, setupType: input.setupType, activitySector: input.activitySector });
  const hasLocalProgramScope = localSupportEmirates.has(input.emirate);
  const supportEmirate = hasLocalProgramScope ? input.emirate as "abu_dhabi" | "dubai" | "sharjah" | "ajman" : "any";
  const support = matchStartupSupport({ stage: input.stage, supportType: input.supportType, emirate: supportEmirate });
  const supportMatches = !hasLocalProgramScope
    ? support.matches.filter((match) => match.scope === "federal")
    : support.matches;
  const jurisdiction = input.emirate === "dubai" ? "dubai" : input.emirate === "abu_dhabi" ? "abu_dhabi" : "federal";
  const residency = assessGoldenResidencyReadiness({ pathway: "entrepreneur", jurisdiction });

  return {
    kind: "uae_founder_pathway" as const,
    verifiedAt: "2026-07-17" as const,
    decision: "planning_only" as const,
    stored: false,
    input: { ...input },
    steps: [
      {
        id: "establish" as const,
        order: 1,
        title: { en: "Establish through the competent authority", ar: "أسّس عبر الجهة المختصة" },
        status: "official_route" as const,
        officialAction: { label: { ...setup.primaryRoute.label }, url: setup.primaryRoute.url },
        checklist: setup.checklist.map((item) => ({ ...item })),
      },
      {
        id: "support" as const,
        order: 2,
        title: { en: "Find relevant founder support", ar: "اعثر على دعم مناسب للمؤسس" },
        status: supportMatches.length > 0 ? "matches_found" as const : "no_precise_match" as const,
        matches: supportMatches.map((match) => ({ ...match, name: { ...match.name }, operator: { ...match.operator }, reasons: match.reasons.map((reason) => ({ ...reason })), summary: { ...match.summary }, eligibilityNotes: match.eligibilityNotes.map((note) => ({ ...note })) })),
      },
      {
        id: "residency_readiness" as const,
        order: 3,
        title: { en: "Prepare entrepreneur residency evidence", ar: "جهّز أدلة إقامة رائد الأعمال" },
        status: "readiness_only" as const,
        jurisdiction,
        eligibilityDetermined: false,
        missingEvidence: residency.missingEvidence.map((item) => ({ ...item, label: { ...item.label } })),
        officialAction: { label: { ...residency.nextStep.label }, url: residency.nextStep.url, categorySpecific: residency.nextStep.categorySpecific },
      },
    ] as const,
    caveats: [
      { en: "This journey orders official starting points; it does not create a company, submit an application or determine eligibility.", ar: "يرتب هذا المسار نقاط البداية الرسمية؛ ولا يؤسس شركة أو يقدم طلبًا أو يحدد الأهلية." },
      { en: "Programme availability, licensing rules and residency requirements can change. Verify every linked authority before acting.", ar: "قد تتغير البرامج وقواعد الترخيص ومتطلبات الإقامة. تحقق من كل جهة مرتبطة قبل اتخاذ إجراء." },
      { en: "No name, email, phone, passport, pitch deck or financial record is accepted or stored.", ar: "لا يُقبل أو يُخزن اسم أو بريد أو هاتف أو جواز أو عرض استثماري أو سجل مالي." },
    ],
  };
}
