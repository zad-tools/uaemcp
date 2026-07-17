type Localized = Readonly<{ en: string; ar: string }>;

export const BUSINESS_EMIRATES = ["abu_dhabi", "dubai", "sharjah", "ajman", "umm_al_quwain", "ras_al_khaimah", "fujairah"] as const;
export type BusinessEmirate = typeof BUSINESS_EMIRATES[number];
export const BUSINESS_SETUP_TYPES = ["mainland", "free_zone", "unsure"] as const;
export type BusinessSetupType = typeof BUSINESS_SETUP_TYPES[number];
export const BUSINESS_ACTIVITY_SECTORS = ["technology", "professional", "commercial", "industrial", "tourism", "food", "other"] as const;
export type BusinessActivitySector = typeof BUSINESS_ACTIVITY_SECTORS[number];

export type BusinessSetupInput = Readonly<{ emirate: BusinessEmirate; setupType: BusinessSetupType; activitySector?: BusinessActivitySector }>;

const MAINLAND_GUIDE = "https://u.ae/en/information-and-services/business/doing-business-on-the-mainland/steps-to-start-a-business-on-the-mainland";
const FREE_ZONE_GUIDE = "https://u.ae/en/information-and-services/business/doing-business-in-free-zones/starting-a-business-in-a-free-zone";

const authorities = Object.freeze({
  abu_dhabi: { emirate: { en: "Abu Dhabi", ar: "أبوظبي" }, authority: { en: "TAMM / Abu Dhabi Department of Economic Development", ar: "تم / دائرة التنمية الاقتصادية – أبوظبي" }, officialUrl: "https://www.tamm.abudhabi/en/life-events/business" },
  dubai: { emirate: { en: "Dubai", ar: "دبي" }, authority: { en: "Invest in Dubai", ar: "استثمر في دبي" }, officialUrl: "https://app.invest.dubai.ae/" },
  sharjah: { emirate: { en: "Sharjah", ar: "الشارقة" }, authority: { en: "Sharjah Economic Development Department", ar: "دائرة التنمية الاقتصادية بالشارقة" }, officialUrl: "https://sedd.ae/en/" },
  ajman: { emirate: { en: "Ajman", ar: "عجمان" }, authority: { en: "Ajman Department of Economic Development", ar: "دائرة التنمية الاقتصادية – عجمان" }, officialUrl: "https://www.ajmanded.ae/en/services/services-directory/future-investor/issue-trade-license" },
  umm_al_quwain: { emirate: { en: "Umm Al Quwain", ar: "أم القيوين" }, authority: { en: "Umm Al Quwain Department of Economic Development", ar: "دائرة التنمية الاقتصادية – أم القيوين" }, officialUrl: "https://ded.uaq.ae/en/home.html" },
  ras_al_khaimah: { emirate: { en: "Ras Al Khaimah", ar: "رأس الخيمة" }, authority: { en: "Ras Al Khaimah Department of Economic Development", ar: "دائرة التنمية الاقتصادية – رأس الخيمة" }, officialUrl: "https://ded.rak.ae/" },
  fujairah: { emirate: { en: "Fujairah", ar: "الفجيرة" }, authority: { en: "Fujairah Government business services", ar: "خدمات الأعمال – حكومة الفجيرة" }, officialUrl: "https://fujairah.ae/en/Pages/settingupbusinessinfujairah.aspx" },
} satisfies Record<BusinessEmirate, { emirate: Localized; authority: Localized; officialUrl: string }>);

const checklist: readonly Localized[] = Object.freeze([
  { en: "Confirm the economic activity and whether an external regulator must approve it.", ar: "حدد النشاط الاقتصادي وما إذا كان يحتاج موافقة جهة تنظيمية خارجية." },
  { en: "Compare mainland and free-zone jurisdiction, permitted activity and operating geography.", ar: "قارن بين البر الرئيسي والمنطقة الحرة من حيث الاختصاص والنشاط المسموح ونطاق التشغيل." },
  { en: "Choose the legal form and reserve a compliant trade name on the official portal.", ar: "اختر الشكل القانوني واحجز اسمًا تجاريًا متوافقًا عبر البوابة الرسمية." },
  { en: "Confirm premises, ownership, approvals, documents and total fees with the issuing authority.", ar: "تحقق من المقر والملكية والموافقات والمستندات وإجمالي الرسوم لدى جهة الإصدار." },
  { en: "Apply only through the competent authority or its listed authorised channel.", ar: "قدم فقط عبر الجهة المختصة أو قناة معتمدة مذكورة لديها." },
]);

export function businessSetupCatalogue() {
  return {
    kind: "uae_business_setup_navigator" as const,
    verifiedAt: "2026-07-17" as const,
    mainlandAuthorities: BUSINESS_EMIRATES.map((id) => ({ id, ...authorities[id] })),
    federalGuides: { mainland: MAINLAND_GUIDE, freeZone: FREE_ZONE_GUIDE },
    checklist: checklist.map((item) => ({ ...item })),
    privacy: { stored: false, acceptedFields: ["emirate", "setupType", "activitySector"] },
    disclaimer: { en: "Routing information only, not legal, tax or licensing advice. Activities, approvals, fees and availability can change; verify on the linked official portal.", ar: "معلومات توجيهية فقط وليست استشارة قانونية أو ضريبية أو ترخيصية. قد تتغير الأنشطة والموافقات والرسوم والتوفر؛ تحقق عبر البوابة الرسمية المرتبطة." },
  };
}

export function routeBusinessSetup(input: BusinessSetupInput) {
  const mainland = { kind: "mainland_authority" as const, label: authorities[input.emirate].authority, url: authorities[input.emirate].officialUrl };
  const freeZone = { kind: "free_zone_directory" as const, label: { en: "Official UAE free-zone setup guide", ar: "الدليل الرسمي لتأسيس الأعمال في المناطق الحرة" }, url: FREE_ZONE_GUIDE };
  const primaryRoute = input.setupType === "free_zone" ? freeZone : mainland;
  const alternatives = input.setupType === "unsure" ? [mainland, freeZone] : [primaryRoute];
  return {
    kind: "uae_business_setup_route" as const, decision: "routing_only" as const, stored: false,
    input: { ...input }, emirate: { ...authorities[input.emirate].emirate }, primaryRoute,
    alternatives, checklist: checklist.map((item) => ({ ...item })),
    sectorNotice: input.activitySector ? { en: `${input.activitySector} is a navigation hint only; the authority decides the exact licensed activity and approvals.`, ar: `القطاع (${input.activitySector}) تلميح للتوجيه فقط؛ الجهة المختصة تحدد النشاط المرخص والموافقات.` } : null,
    caveats: [
      { en: "This navigator does not compare packages, promise approval, calculate fees or select a legal form.", ar: "لا يقارن هذا الدليل الباقات ولا يضمن الموافقة ولا يحسب الرسوم ولا يختار الشكل القانوني." },
      { en: "Free-zone rules are authority-specific; use the federal directory to choose and then verify with that zone.", ar: "تختلف قواعد المناطق الحرة حسب الجهة؛ استخدم الدليل الاتحادي للاختيار ثم تحقق مع المنطقة نفسها." },
    ],
    sources: [MAINLAND_GUIDE, FREE_ZONE_GUIDE, authorities[input.emirate].officialUrl],
  };
}
