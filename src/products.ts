type LocalizedText = Readonly<{ en: string; ar: string }>;

export type PublicProduct = Readonly<{
  id: string;
  status: "published";
  access: "public";
  category: string;
  categoryAr: string;
  title: LocalizedText;
  description: LocalizedText;
  webPath: string;
  apiPath: string;
  sourceIds: readonly string[];
  evidence: Readonly<{
    scope: LocalizedText;
    limitations: readonly LocalizedText[];
  }>;
}>;

const PRODUCTS: readonly PublicProduct[] = Object.freeze([
  {
    id: "connectivity_pulse",
    status: "published",
    access: "public",
    category: "CONNECTIVITY / SERIES",
    categoryAr: "الاتصالات / السلاسل",
    title: { en: "UAE Connectivity Pulse", ar: "نبض الاتصالات في الإمارات" },
    description: {
      en: "Inspect three official TDRA monthly subscription series from 2011–2025 without merging unlike units.",
      ar: "افحص ثلاث سلاسل شهرية رسمية لاشتراكات الاتصالات من الهيئة للفترة 2011–2025 دون دمج الوحدات المختلفة.",
    },
    webPath: "/connectivity",
    apiPath: "/api/v1/connectivity",
    sourceIds: ["tdra_active_mobile_subscriptions_2025", "tdra_broadband_per_100_2025", "tdra_fixed_lines_per_100_2025"],
    evidence: {
      scope: { en: "Three source-native monthly TDRA series published through December 2025.", ar: "ثلاث سلاسل شهرية أصلية للمصدر منشورة من الهيئة حتى ديسمبر 2025." },
      limitations: [
        { en: "Subscriptions are not unique people; per-100 measures do not prove coverage, speed, quality, affordability or digital inclusion.", ar: "الاشتراكات ليست أشخاصًا فريدين، ومؤشرات كل 100 نسمة لا تثبت التغطية أو السرعة أو الجودة أو التكلفة أو الشمول الرقمي." },
      ],
    },
  },
  {
    id: "policy_evidence_watch", status: "published", access: "public", category: "POLICY / EVIDENCE", categoryAr: "السياسات / الأدلة",
    title: { en: "UAE Policy Evidence Watch", ar: "مرصد أدلة السياسات في الإمارات" },
    description: { en: "Track bounded content fingerprints for five audited official UAE legislation and policy pages without claiming that a detected page difference changed the law.", ar: "تتبّع بصمات محتوى محدودة لخمس صفحات إماراتية رسمية مدققة للتشريعات والسياسات دون الادعاء بأن اختلاف الصفحة غيّر القانون." },
    webPath: "/policy-watch", apiPath: "/api/v1/policy-watch", sourceIds: ["uae_legislation_catalogue", "fta_legislation_index", "mohre_resolutions_circulars", "icp_policy_announcements", "uae_cabinet_news"],
    evidence: { scope: { en: "Daily hosted checks retain SHA-256 fingerprints, timestamps and excerpts capped at 240 characters.", ar: "تحتفظ الفحوصات اليومية المستضافة ببصمات SHA-256 والطوابع الزمنية ومقتطفات لا تتجاوز 240 حرفًا." }, limitations: [{ en: "A published-page content difference does not determine legal effect, commencement, eligibility or advice.", ar: "لا يحدد اختلاف محتوى الصفحة المنشورة أثرًا قانونيًا أو بدء نفاذ أو أهلية أو استشارة." }] },
  },
  {
    id: "evidence_studio", status: "published", access: "public", category: "RESEARCH / DOSSIER", categoryAr: "البحث / ملف الأدلة",
    title: { en: "UAE Evidence Studio", ar: "استوديو الأدلة الإماراتية" },
    description: { en: "Compose selected official evidence into one bilingual, printable and downloadable dossier with every source boundary intact.", ar: "اجمع الأدلة الرسمية المختارة في ملف واحد ثنائي اللغة قابل للطباعة والتنزيل مع الحفاظ على حدود كل مصدر." },
    webPath: "/evidence-studio", apiPath: "/api/v1/evidence-dossier", sourceIds: ["fcsc_unified_uae_numbers_2025", "mohap_health_facilities_2024", "mohap_health_core_indicators_2024", "moiat_industrial_licenses", "fta_service_activity_2025"],
    evidence: { scope: { en: "A stateless composition of two to five existing official evidence pillars.", ar: "تركيب بلا تخزين لمحورين إلى خمسة محاور من الأدلة الرسمية القائمة." }, limitations: [{ en: "Different periods and units remain separate; no ranking, composite score or generative narrative is produced.", ar: "تبقى الفترات والوحدات المختلفة منفصلة، ولا يُنتج ترتيب أو مؤشر مركب أو سرد مولّد." }] },
  },
  {
    id: "founder_pathway", status: "published", access: "public", category: "FOUNDER / JOURNEY", categoryAr: "المؤسس / الرحلة",
    title: { en: "UAE Founder Pathway", ar: "مسار المؤسس في الإمارات" },
    description: { en: "Build, track, print and export one source-linked action dossier across official setup, startup support and entrepreneur residency readiness.", ar: "ابنِ وتابع واطبع وصدّر ملف تنفيذ واحدًا مرتبطًا بالمصادر عبر التأسيس الرسمي ودعم الشركات الناشئة وجاهزية إقامة رائد الأعمال." },
    webPath: "/founder-pathway", apiPath: "/api/v1/founder-pathway", sourceIds: ["icp_golden_residency"],
    evidence: { scope: { en: "A composition of the dated official setup, startup-support and Golden Residency evidence catalogues, verified 17 July 2026.", ar: "تركيب من كتالوجات أدلة التأسيس ودعم الشركات الناشئة والإقامة الذهبية الرسمية والمؤرخة، متحقق منها في 17 يوليو 2026." }, limitations: [{ en: "Planning only; it does not license a company, accept a programme application or determine residency eligibility.", ar: "للتخطيط فقط؛ لا يرخص شركة ولا يقبل طلب برنامج ولا يحدد أهلية الإقامة." }] },
  },
  {
    id: "national_evidence_brief", status: "published", access: "public", category: "NATIONAL / EVIDENCE", categoryAr: "وطني / أدلة",
    title: { en: "UAE National Evidence Brief", ar: "موجز الأدلة الوطني للإمارات" },
    description: { en: "Read education, health, industry and tax-service activity side by side with source-native units, periods and limitations.", ar: "اقرأ التعليم والصحة والصناعة ونشاط الخدمات الضريبية جنبًا إلى جنب مع الوحدات والفترات والحدود الأصلية للمصادر." },
    webPath: "/national-brief", apiPath: "/api/v1/national-brief", sourceIds: ["fcsc_unified_uae_numbers_2025", "mohap_health_core_indicators_2024", "moiat_industrial_licenses", "fta_service_activity_2025"],
    evidence: { scope: { en: "Four official evidence pillars presented without cross-pillar aggregation or composite scoring.", ar: "أربعة محاور من الأدلة الرسمية معروضة دون جمع بين المحاور أو درجات مركبة." }, limitations: [{ en: "Periods, units and coverage differ; pillars must not be added or ranked together.", ar: "تختلف الفترات والوحدات والتغطية؛ ولا يجوز جمع المحاور أو ترتيبها معًا." }] },
  },
  {
    id: "startup_support_navigator", status: "published", access: "public", category: "STARTUPS / SUPPORT", categoryAr: "الشركات الناشئة / الدعم",
    title: { en: "UAE Startup Support Navigator", ar: "دليل دعم الشركات الناشئة في الإمارات" },
    description: { en: "Discover relevant official and government-backed accelerators, incubators, finance and market-access programmes by stage and location.", ar: "اكتشف المسرعات والحاضنات وبرامج التمويل والوصول للسوق الرسمية والمدعومة حكوميًا حسب المرحلة والموقع." },
    webPath: "/startup-support", apiPath: "/api/v1/startup-support", sourceIds: [],
    evidence: { scope: { en: "Nine primary programme pages from federal, Abu Dhabi, Dubai, Sharjah and Ajman operators, verified 17 July 2026.", ar: "تسع صفحات برامج أولية من جهات اتحادية وفي أبوظبي ودبي والشارقة وعجمان، متحقق منها في 17 يوليو 2026." }, limitations: [{ en: "Relevance is not eligibility, acceptance, funding approval or advice to take debt or give equity.", ar: "الملاءمة ليست أهلية أو قبولًا أو موافقة تمويل أو نصيحة بالاقتراض أو التنازل عن ملكية." }] },
  },
  {
    id: "business_setup_navigator", status: "published", access: "public", category: "BUSINESS / SETUP", categoryAr: "الأعمال / التأسيس",
    title: { en: "UAE Business Setup Navigator", ar: "دليل تأسيس الأعمال في الإمارات" },
    description: { en: "Route founders to the competent official mainland or free-zone starting point across all seven emirates without intermediaries or personal-data collection.", ar: "وجّه المؤسسين إلى نقطة البداية الرسمية المختصة في البر الرئيسي أو المناطق الحرة عبر الإمارات السبع دون وسطاء أو جمع بيانات شخصية." },
    webPath: "/business-setup", apiPath: "/api/v1/business-setup", sourceIds: [],
    evidence: { scope: { en: "Official federal setup guidance and the competent mainland authority for every emirate, verified 17 July 2026.", ar: "إرشادات التأسيس الاتحادية الرسمية وجهة البر الرئيسي المختصة لكل إمارة، متحقق منها في 17 يوليو 2026." }, limitations: [{ en: "Routing only; it does not choose a legal form, calculate fees, recommend a package or guarantee approval.", ar: "توجيه فقط؛ لا يختار شكلًا قانونيًا ولا يحسب الرسوم ولا يوصي بباقة ولا يضمن الموافقة." }] },
  },
  {
    id: "golden_residency_navigator", status: "published", access: "public", category: "RESIDENCY / READINESS", categoryAr: "الإقامة / الجاهزية",
    title: { en: "UAE Golden Residency Navigator", ar: "دليل الإقامة الذهبية في الإمارات" },
    description: { en: "Map non-identifying evidence to current official pathway requirements without promises, intermediaries or stored personal data.", ar: "اربط أدلتك غير التعريفية بمتطلبات المسارات الرسمية الحالية دون وعود أو وسطاء أو تخزين بيانات شخصية." },
    webPath: "/golden-residency", apiPath: "/api/v1/golden-residency", sourceIds: ["icp_golden_residency"],
    evidence: { scope: { en: "Current ICP and u.ae pathway requirements verified on 17 July 2026.", ar: "متطلبات المسارات الحالية من الهيئة والمنصة الرسمية، متحقق منها في 17 يوليو 2026." }, limitations: [{ en: "Informational readiness only; the competent authority makes the final decision and requirements can change.", ar: "جاهزية معلوماتية فقط؛ القرار النهائي للجهة المختصة وقد تتغير المتطلبات." }] },
  },
  {
    id: "education_ledger",
    status: "published",
    access: "public",
    category: "EDUCATION / LEDGER",
    categoryAr: "التعليم / السجل",
    title: { en: "UAE Education Ledger", ar: "سجل التعليم في الإمارات" },
    description: {
      en: "Read a reconciled national 2023/2024 education snapshot alongside the Ministry's separate 2018–2024 resource catalogue.",
      ar: "اقرأ لقطة وطنية متطابقة للتعليم لعام 2023/2024 إلى جانب كتالوج موارد الوزارة المستقل للفترة 2018–2024.",
    },
    webPath: "/education",
    apiPath: "/api/v1/education",
    sourceIds: ["fcsc_unified_uae_numbers_2025", "bayanat_uae_open_data"],
    evidence: {
      scope: { en: "FCSC-accredited national totals plus seven Ministry of Education catalogue resources.", ar: "إجماليات وطنية معتمدة من المركز الاتحادي وسبعة موارد مفهرسة لوزارة التربية." },
      limitations: [
        { en: "The retained report is a verified snapshot, not a real-time enrollment feed; catalogue resources are not merged into it.", ar: "التقرير المحتفظ به نسخة موثقة وليس تغذية لحظية، ولا تُدمج موارد الكتالوج داخله." },
      ],
    },
  },
  {
    id: "health_indicators",
    status: "published",
    access: "public",
    category: "HEALTH / SERIES",
    categoryAr: "الصحة / السلاسل الزمنية",
    title: { en: "UAE Health Indicators", ar: "مؤشرات الصحة في الإمارات" },
    description: {
      en: "Inspect official MOHAP health indicator rows across the workbook's visible year columns without undocumented normalization.",
      ar: "افحص صفوف مؤشرات الصحة الرسمية عبر السنوات الظاهرة في ملف الوزارة دون تطبيع غير موثق.",
    },
    webPath: "/health-indicators",
    apiPath: "/api/v1/health-indicators",
    sourceIds: ["mohap_health_core_indicators_2024"],
    evidence: {
      scope: { en: "111 source-native indicator rows from the official MOHAP 2024 workbook.", ar: "111 صف مؤشر بقيمها الأصلية من ملف وزارة الصحة الرسمي المنشور لعام 2024." },
      limitations: [
        { en: "Visible series currently end at 2023 and ratio/percentage scales are not consistently encoded.", ar: "السلاسل الظاهرة تنتهي حاليًا في 2023 وترميز النسب والقيم المئوية غير متسق." },
      ],
    },
  },
  {
    id: "health_facilities_atlas",
    status: "published",
    access: "public",
    category: "HEALTH / FACILITIES",
    categoryAr: "الصحة / المنشآت",
    title: { en: "UAE Health Facilities Atlas", ar: "أطلس المنشآت الصحية في الإمارات" },
    description: { en: "Explore official reported facility counts from 2015–2024 by emirate, sector, category and type.", ar: "استكشف أعداد المنشآت المبلّغ عنها رسميًا للفترة 2015–2024 حسب الإمارة والقطاع والفئة والنوع." },
    webPath: "/health-facilities",
    apiPath: "/api/v1/health-facilities",
    sourceIds: ["mohap_health_facilities_2024"],
    evidence: { scope: { en: "950 aggregate MOHAP rows covering seven emirates and ten published years.", ar: "950 صفًا مجمعًا من وزارة الصحة تغطي الإمارات السبع وعشر سنوات منشورة." }, limitations: [{ en: "Rows are not individual facilities; counts do not measure beds, capacity, workforce, access or quality.", ar: "الصفوف ليست منشآت فردية، والأعداد لا تقيس الأسرّة أو الطاقة الاستيعابية أو الكوادر أو الوصول أو الجودة." }] },
  },
  {
    id: "health_facilities_map",
    status: "published",
    access: "public",
    category: "HEALTH / COORDINATES",
    categoryAr: "الصحة / الإحداثيات",
    title: { en: "UAE Health Facilities Map", ar: "خريطة المنشآت الصحية في الإمارات" },
    description: {
      en: "Search official MOHAP 2026 facility names and plot only coordinates that fall inside a bounded UAE frame.",
      ar: "ابحث في أسماء المنشآت الرسمية المنشورة من وزارة الصحة لعام 2026 واعرض فقط الإحداثيات الواقعة داخل إطار الإمارات المحدد.",
    },
    webPath: "/health-facilities-map",
    apiPath: "/api/v1/health-facilities-map",
    sourceIds: ["mohap_health_facilities_gis_2026"],
    evidence: {
      scope: { en: "15,326 published rows; 7,471 have coordinates inside the bounded UAE frame and 7,855 invalid, empty or 90,90 coordinates are excluded.", ar: "15,326 صفًا منشورًا؛ منها 7,471 بإحداثيات داخل إطار الإمارات المحدد، واستُبعدت 7,855 قيمة فارغة أو غير صالحة أو 90,90." },
      limitations: [
        { en: "A name and coordinate do not establish licence, type, ownership, operation, services, capacity, accessibility or quality.", ar: "لا يثبت الاسم والإحداثي الترخيص أو النوع أو الملكية أو التشغيل أو الخدمات أو السعة أو سهولة الوصول أو الجودة." },
      ],
    },
  },
  {
    id: "trade_flow_radar",
    status: "published",
    access: "public",
    category: "TRADE / FLOW",
    categoryAr: "التجارة / التدفقات",
    title: { en: "UAE Trade Flow Radar", ar: "رادار تدفقات التجارة" },
    description: {
      en: "Explore official Ajman export and re-export certificate records by destination, transport, product, month and origin.",
      ar: "استكشف سجلات شهادات المنشأ الرسمية في عجمان للتصدير وإعادة التصدير حسب الوجهة والنقل والمنتج والشهر والمنشأ.",
    },
    webPath: "/trade-flow",
    apiPath: "/api/v1/trade-flow",
    sourceIds: ["ajman_data_portal"],
    evidence: {
      scope: {
        en: "Bounded samples from four official Ajman 2023 certificate-of-origin datasets.",
        ar: "عينات محدودة من أربع مجموعات بيانات رسمية لشهادات المنشأ في عجمان لعام 2023.",
      },
      limitations: [
        { en: "Record counts are not trade value, weight, shipments, companies or total UAE trade.", ar: "عدد السجلات لا يمثل القيمة أو الوزن أو الشحنات أو عدد الشركات أو إجمالي تجارة الإمارات." },
      ],
    },
  },
  {
    id: "ajman_business_evidence",
    status: "published",
    access: "public",
    category: "BUSINESS / EVIDENCE",
    categoryAr: "الأعمال / الأدلة",
    title: { en: "Ajman Business Evidence", ar: "أدلة الأعمال في عجمان" },
    description: {
      en: "Explore bounded official Ajman license records by activity, area, legal form, type and published status.",
      ar: "استكشف عينات محدودة من سجلات الرخص الرسمية في عجمان حسب النشاط والمنطقة والشكل القانوني والنوع والحالة المنشورة.",
    },
    webPath: "/ajman-business",
    apiPath: "/api/v1/ajman-business",
    sourceIds: ["ajman_data_portal"],
    evidence: {
      scope: { en: "Three distinct live OpenDataSoft datasets published through the official Ajman Data portal.", ar: "ثلاث مجموعات بيانات حية ومتميزة منشورة عبر بوابة بيانات عجمان الرسمية." },
      limitations: [
        { en: "Dataset rows are bounded samples and cannot be added together as unique companies, market size or business growth.", ar: "صفوف البيانات عينات محدودة ولا يجوز جمعها باعتبارها شركات فريدة أو حجم سوق أو نمو أعمال." },
      ],
    },
  },
  {
    id: "ajman_urban_evidence", status: "published", access: "public", category: "URBAN / SERIES", categoryAr: "العمران / السلاسل",
    title: { en: "Ajman Urban Evidence", ar: "أدلة التطور الحضري في عجمان" },
    description: { en: "Inspect bounded observations of official building permissions, certified rent contracts, new-road length and developed crossroads in their source-native units.", ar: "افحص مشاهدات محدودة من البيانات الرسمية لتراخيص البناء وعقود الإيجار المصدقة وطول الطرق الجديدة والتقاطعات المطورة بوحداتها الأصلية." },
    webPath: "/ajman-urban", apiPath: "/api/v1/ajman-urban", sourceIds: ["ajman_data_portal"],
    evidence: { scope: { en: "Six distinct live datasets published through the official Ajman Data portal.", ar: "ست مجموعات بيانات حية ومستقلة منشورة عبر بوابة بيانات عجمان الرسمية." }, limitations: [{ en: "Building, rent and road measures stay separate and are not a property index, investment return or composite growth score.", ar: "تبقى مقاييس البناء والإيجار والطرق منفصلة وليست مؤشرًا عقاريًا أو عائدًا استثماريًا أو درجة نمو مركبة." }] },
  },
  {
    id: "ajman_parks_footfall",
    status: "published",
    access: "public",
    category: "CIVIC / OBSERVATIONS",
    categoryAr: "مدني / مشاهدات",
    title: { en: "Ajman Parks Footfall", ar: "زيارات حدائق عجمان" },
    description: { en: "Explore official monthly park-visit observations by year and source-native park label.", ar: "استكشف مشاهدات زيارات الحدائق الرسمية شهريًا حسب السنة ومسمى الحديقة الأصلي." },
    webPath: "/ajman-parks",
    apiPath: "/api/v1/ajman-parks",
    sourceIds: ["ajman_data_portal"],
    evidence: { scope: { en: "The official Parks Visitors in Ajman dataset, currently published for 2017–2023 under CC BY 4.0.", ar: "مجموعة بيانات زوار حدائق عجمان الرسمية المنشورة حاليًا للفترة 2017–2023 بترخيص CC BY 4.0." }, limitations: [{ en: "Visits are not unique people, demand, tourism performance, satisfaction, capacity or park quality.", ar: "الزيارات ليست أشخاصًا فريدين ولا طلبًا أو أداءً سياحيًا أو رضا أو سعة أو جودة للحدائق." }] },
  },
  {
    id: "industry_atlas",
    status: "published",
    access: "public",
    category: "INDUSTRY / MAP",
    categoryAr: "الصناعة / الخريطة",
    title: { en: "Industry Atlas", ar: "أطلس الصناعة" },
    description: {
      en: "Inspect the geographic and sector distribution of official industrial-establishment records.",
      ar: "افحص التوزيع الجغرافي والقطاعي لسجلات المنشآت الصناعية الرسمية.",
    },
    webPath: "/industry-atlas",
    apiPath: "/api/v1/industry-atlas",
    sourceIds: ["moiat_industrial_licenses"],
    evidence: {
      scope: { en: "A bounded sample of official MOIAT industrial-license records.", ar: "عينة محدودة من سجلات التراخيص الصناعية الرسمية لوزارة الصناعة والتكنولوجيا المتقدمة." },
      limitations: [
        { en: "The sample is not a national establishment population or proof of current operation.", ar: "العينة ليست تعدادًا وطنيًا للمنشآت ولا دليلًا على استمرار التشغيل حاليًا." },
      ],
    },
  },
  {
    id: "tax_service_activity",
    status: "published",
    access: "public",
    category: "TAX / ACTIVITY",
    categoryAr: "الضرائب / النشاط",
    title: { en: "Tax Service Activity", ar: "نشاط الخدمات الضريبية" },
    description: {
      en: "Read the Federal Tax Authority's published 2025 service-activity counts with source-native context.",
      ar: "اقرأ أعداد نشاط خدمات الهيئة الاتحادية للضرائب المنشورة لعام 2025 مع سياقها الأصلي.",
    },
    webPath: "/tax-services",
    apiPath: "/api/v1/tax-services",
    sourceIds: ["fta_service_activity_2025"],
    evidence: {
      scope: { en: "Published 2025 quarterly service-activity records from the FTA workbook.", ar: "سجلات نشاط الخدمات الفصلية المنشورة لعام 2025 من ملف الهيئة الاتحادية للضرائب." },
      limitations: [
        { en: "Activity counts are not revenue, taxpayers, companies or economic growth.", ar: "أعداد النشاط لا تمثل الإيرادات أو دافعي الضرائب أو الشركات أو النمو الاقتصادي." },
      ],
    },
  },
  {
    id: "fta_archive",
    status: "published",
    access: "public",
    category: "TAX / ARCHIVE",
    categoryAr: "الضرائب / الأرشيف",
    title: { en: "FTA Archive Explorer", ar: "مستكشف أرشيف الضرائب" },
    description: {
      en: "Inspect three official FTA workbooks without forcing incompatible periods into one trend.",
      ar: "افحص ثلاثة ملفات رسمية للهيئة دون دمج فترات غير متوافقة في اتجاه واحد.",
    },
    webPath: "/tax-services/archive",
    apiPath: "/api/v1/tax-services/archive",
    sourceIds: ["fta_selected_services_2017_2022", "fta_service_activity_2024", "fta_service_activity_2025"],
    evidence: {
      scope: { en: "Source-native views for 2017–2022, 2024 and 2025.", ar: "عروض تحافظ على الشكل الأصلي لفترات 2017–2022 و2024 و2025." },
      limitations: [
        { en: "Scopes differ, 2023 is missing and cross-period comparison is disabled.", ar: "النطاقات مختلفة وبيانات 2023 مفقودة والمقارنة بين الفترات متوقفة." },
      ],
    },
  },
  {
    id: "place_names",
    status: "published",
    access: "public",
    category: "GEOGRAPHY / NAMES",
    categoryAr: "الجغرافيا / الأسماء",
    title: { en: "National Place Names", ar: "أسماء الأماكن الوطنية" },
    description: {
      en: "Search and inspect official UAE geographic names with bilingual labels and coordinates.",
      ar: "ابحث في الأسماء الجغرافية الرسمية في الإمارات مع التسميات الثنائية والإحداثيات.",
    },
    webPath: "/places",
    apiPath: "/api/v1/places",
    sourceIds: ["fgic_national_gazetteer"],
    evidence: {
      scope: { en: "Bounded records from the official national gazetteer source.", ar: "سجلات محدودة من المصدر الرسمي للمعجم الجغرافي الوطني." },
      limitations: [
        { en: "Place points are not an authoritative administrative-boundary reference.", ar: "نقاط الأماكن ليست مرجعًا معتمدًا للحدود الإدارية." },
      ],
    },
  },
  {
    id: "open_data_observatory",
    status: "published",
    access: "public",
    category: "RELIABILITY / STATUS",
    categoryAr: "الموثوقية / الحالة",
    title: { en: "Open Data Observatory", ar: "مرصد البيانات المفتوحة" },
    description: {
      en: "Monitor stored source checks, incidents, latency and measured availability across the registry.",
      ar: "راقب فحوصات المصادر المخزنة والحوادث وزمن الاستجابة والتوافر المقاس عبر السجل.",
    },
    webPath: "/observatory",
    apiPath: "/api/v1/observatory",
    sourceIds: [],
    evidence: {
      scope: { en: "Stored health observations generated by the running platform.", ar: "ملاحظات صحة مخزنة أنشأتها المنصة أثناء التشغيل." },
      limitations: [
        { en: "Unknown means unmeasured, not healthy; the report is not continuous external monitoring.", ar: "غير معروف تعني غير مقاس وليست سليمًا؛ والتقرير ليس مراقبة خارجية مستمرة." },
      ],
    },
  },
]);

export function listProducts(): PublicProduct[] {
  return PRODUCTS.map((product) => ({
    ...product,
    title: { ...product.title },
    description: { ...product.description },
    sourceIds: [...product.sourceIds],
    evidence: {
      scope: { ...product.evidence.scope },
      limitations: product.evidence.limitations.map((item) => ({ ...item })),
    },
  }));
}
