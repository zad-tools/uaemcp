/**
 * The registry of official UAE open-data sources.
 *
 * Built-in sources are curated and verified against their live endpoints. Users
 * may add extra metadata-only sources at runtime (write-token gated); those are
 * persisted to a JSON file and can never override a built-in entry.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { SourceNotFound, ValidationError } from "./errors.js";

export type SourceKind = "http_json" | "ckan" | "ods" | "arcgis" | "socrata" | "csv" | "xlsx" | "xml" | "rss" | "graphql" | "sdmx" | "sparql" | "metadata";
export type AccessStatus = "live" | "blocked" | "key_required" | "metadata_only";

export interface Source {
  id: string;
  name_en: string;
  name_ar: string;
  owner: string;
  category: string;
  kind: SourceKind;
  base_url: string;
  endpoint: string;
  docs_url: string;
  license: string;
  default_params: Record<string, unknown>;
  row_path: string[];
  max_page_size: number | null;
  notes: string;
  origin: "built_in" | "custom";
  /** Connector-specific settings (ODS api_base, ArcGIS service_url, geo fields…). */
  connector_config: Record<string, unknown>;
  /** True when the official API exists but needs a registered developer key. */
  requires_api_key: boolean;
  /** Provider developer portal, when key-gated. */
  api_docs: string;
  access_status: AccessStatus;
}

export interface CustomSourceInput {
  id: string; name_en: string; name_ar: string; owner: string; base_url: string;
  kind?: SourceKind; category?: string; endpoint?: string; docs_url?: string;
  license?: string; notes?: string; row_path?: string[];
  default_params?: Record<string, unknown>; connector_config?: Record<string, unknown>;
  max_page_size?: number | null;
}

const LICENSE =
  "Open government data; verify source terms before redistribution.";
const MOHAP_HEALTH_FACILITIES_2026_XLSX = "https://mohap.gov.ae/documents/20117/2614454/%D8%A7%D9%84%D9%85%D9%88%D9%82%D8%B9%20%D8%A7%D9%84%D8%AC%D8%BA%D8%B1%D8%A7%D9%81%D9%8A%20%D9%84%D9%84%D9%85%D9%86%D8%B4%D8%A2%D8%AA%20%D8%A7%D9%84%D8%B5%D8%AD%D9%8A%D8%A9%C2%A0%20%E2%80%93%20%D9%84%D8%B9%D8%A7%D9%85%202026%20Geocoded%20Location%20of%20Health%20Facilities%20-%20GIS%C2%A0.xlsx/a88cb9b8-690e-14f7-37c1-77fd188e5b23";
const MOHAP_HEALTH_CORE_INDICATORS_2024_XLSX = "https://mohap.gov.ae/documents/20117/2530326/Core%20Indicator%202024.xlsx/f8275934-9b82-4113-1bf6-9df2848f1e30";
const MOHAP_HEALTH_FACILITIES_2024_XLSX = "https://mohap.gov.ae/documents/20117/2530525/Health%20Facilities_2024.xlsx/dced0099-07e7-e749-0b8f-2955b22aa3fe";
const TDRA_ACTIVE_MOBILE_2025_XLSX = "https://tdra.gov.ae/-/media/Open-Data/Phone-and-internet-subscriptions/Phone-and-Internet-Subscriptions-2025/Active-Mobile-Subscriptions-Dec-2025.ashx";
const TDRA_BROADBAND_PER_100_2025_XLSX = "https://tdra.gov.ae/-/media/Open-Data/Phone-and-internet-subscriptions/Phone-and-Internet-Subscriptions-2025/Broadband-Internet-Subscriptions-per-100-inhabitants-En-Dec-2025.ashx";
const TDRA_FIXED_LINES_PER_100_2025_XLSX = "https://tdra.gov.ae/-/media/Open-Data/Phone-and-internet-subscriptions/Phone-and-Internet-Subscriptions-2025/Fixed-lines-per-100-inhabitants-En-Dec-2025.ashx";
const TDRA_OPEN_DATA_LICENSE = "TDRA Open Data Policy permits use, reuse, distribution and sharing with attribution to TDRA, the file name and publication date, under continued open-data terms.";

function src(p: Partial<Source> & Pick<Source, "id" | "name_en" | "name_ar" | "owner" | "category" | "kind" | "base_url">): Source {
  return {
    endpoint: "",
    docs_url: "",
    license: LICENSE,
    default_params: {},
    row_path: [],
    max_page_size: null,
    notes: "",
    origin: "built_in",
    connector_config: {},
    requires_api_key: false,
    api_docs: "",
    access_status: p.kind === "metadata" ? "metadata_only" : "live",
    ...p,
  };
}

export function fetchUrl(s: Source): string {
  let baseEnd = s.base_url.length;
  while (baseEnd > 0 && s.base_url[baseEnd - 1] === "/") baseEnd -= 1;
  let endpointStart = 0;
  while (endpointStart < s.endpoint.length && s.endpoint[endpointStart] === "/") endpointStart += 1;
  const baseUrl = s.base_url.slice(0, baseEnd);
  const endpoint = s.endpoint.slice(endpointStart);
  return s.endpoint
    ? `${baseUrl}/${endpoint}`
    : s.base_url;
}

export function citation(s: Source): string {
  return s.docs_url || s.base_url;
}

const BUILT_IN: Source[] = [
  src({ id: "icp_golden_residency", name_en: "UAE Golden Residency System", name_ar: "منظومة الإقامة الذهبية", owner: "Federal Authority for Identity, Citizenship, Customs & Port Security", category: "residency", kind: "metadata", base_url: "https://icp.gov.ae/en/services/golden-residency/", docs_url: "https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa", access_status: "metadata_only", license: "Official government service information; verify current requirements with the competent authority.", notes: "Official pathway and evidence requirements, retained as a dated informational catalogue. Not an eligibility decision, application service, or approval guarantee." }),
  src({ id: "moiat_industrial_licenses", name_en: "UAE Industrial Licenses", name_ar: "الرخص الصناعية في الإمارات", owner: "Ministry of Industry and Advanced Technology", category: "industry", kind: "http_json", base_url: "https://api.moiat.gov.ae/", endpoint: "/api/OpenDataAPI/GetIndustrialLicensesList", docs_url: "https://moiat.gov.ae/en/open-data", default_params: { LanguageId: 2, PageNumber: 1, PageSize: 10 }, row_path: ["result", "Factories"], max_page_size: 10, notes: "Live official API. Direct phone/email fields are redacted by default.", connector_config: { geo: { lat_field: "Latitude", lon_field: "Longitude" } } }),
  src({ id: "uae_federal_open_data", name_en: "UAE Federal Open Data Catalogue", name_ar: "فهرس البيانات المفتوحة الاتحادي", owner: "Federal Competitiveness and Statistics Centre", category: "catalogue", kind: "ckan", base_url: "https://opendata.fcsc.gov.ae/", endpoint: "/api/3/action/package_search", docs_url: "https://opendata.fcsc.gov.ae/", default_params: { rows: 10 }, row_path: ["result", "results"], access_status: "blocked", notes: "CKAN portal (package_search + datastore_search). NOTE: currently returns HTTP 403 to server-side clients (WAF / bot mitigation) from most networks — records surface an honest 'source unavailable', never faked." }),
  src({ id: "fcsc_unified_uae_numbers_2025", name_en: "Unified UAE Numbers 2025", name_ar: "الأرقام الموحدة لدولة الإمارات 2025", owner: "Federal Competitiveness and Statistics Centre", category: "statistics", kind: "metadata", base_url: "https://fcsc.gov.ae/wp-content/uploads/2025/12/UAE-Unified-Numbers-En.pdf", docs_url: "https://fcsc.gov.ae/en-us/", license: "Official FCSC publication; attribution required. Education catalogue resources are separately licensed CC BY 4.0.", access_status: "metadata_only", notes: "Official report containing accredited General Education 2023/2024 totals. UAEMCP exposes a verified retained snapshot with SHA-256; the PDF is not treated as a live record API." }),
  src({ id: "fgic_national_gazetteer", name_en: "UAE National Gazetteer", name_ar: "المعجم الجغرافي الوطني للإمارات", owner: "Federal Geographic Information Center", category: "geospatial", kind: "arcgis", base_url: "https://nsdi.fgic.gov.ae/hosting/rest/services/Hosted/UAE_Gazeteer/FeatureServer", docs_url: "https://atlas.fgic.gov.ae/uaeatlas/MapsAndGazetteer/Gazetteer?lang=en", license: "FGIC published information is provided for informational use as-is, without currency or accuracy guarantees; maps are not a reference for administrative or international boundaries. Verify FGIC terms before redistribution.", notes: "Live official federal ArcGIS FeatureServer of bilingual natural and man-made place names with coordinates. The known placeholder descriptioneng field is excluded; other fields remain source-published evidence, not verified narrative.", connector_config: { default_layer: 0, text_search_fields: ["wsearch", "englishname", "gazetteername", "wotaltah"], exclude_fields: ["descriptioneng"] } }),
  src({ id: "dubai_land_department", name_en: "Dubai Land Department Open Data", name_ar: "بيانات دائرة الأراضي والأملاك في دبي", owner: "Dubai Land Department", category: "real_estate", kind: "metadata", base_url: "https://dubailand.gov.ae/", docs_url: "https://dubailand.gov.ae/en/open-data/", requires_api_key: true, access_status: "key_required", api_docs: "https://www.dubaipulse.gov.ae/organisation/dld", notes: "Transaction-level records (sales, rents, valuations) are published through Dubai Pulse as 'dld_transactions' via its key-gated API — see dubai_pulse_catalogue." }),
  src({ id: "dubai_pulse_catalogue", name_en: "Dubai Pulse Open Data", name_ar: "بيانات دبي المفتوحة", owner: "Digital Dubai", category: "catalogue", kind: "metadata", base_url: "https://www.dubaipulse.gov.ae/", docs_url: "https://www.digitaldubai.ae/apps-services/details/data.dubai", requires_api_key: true, access_status: "key_required", api_docs: "https://www.dubaipulse.gov.ae/", notes: "Official Dubai data platform. Machine API is OAuth2 client-credentials at api.dubaipulse.gov.ae; hosts DLD real-estate transactions, DEWA and RTA. Records require a registered API key+secret." }),
  src({ id: "abu_dhabi_open_data", name_en: "Abu Dhabi Open Data", name_ar: "بيانات أبوظبي المفتوحة", owner: "Abu Dhabi Government", category: "catalogue", kind: "metadata", base_url: "https://data.abudhabi/", docs_url: "https://data.abudhabi/opendata/", requires_api_key: true, access_status: "key_required", api_docs: "https://data.abudhabi/developers", notes: "Official Abu Dhabi open-data platform with a registered-developer REST API; records require a free developer key." }),
  src({ id: "bayanat_uae_open_data", name_en: "Bayanat UAE Open Data Portal", name_ar: "بوابة بيانات الإمارات المفتوحة", owner: "UAE Government", category: "national_catalogue", kind: "metadata", base_url: "https://bayanat.ae/", docs_url: "https://bayanat.ae/", notes: "National open-data portal for dataset discovery." }),
  src({ id: "mof_open_data", name_en: "Ministry of Finance Open Data", name_ar: "البيانات المفتوحة لوزارة المالية", owner: "Ministry of Finance", category: "finance", kind: "metadata", base_url: "https://mof.gov.ae/", docs_url: "https://mof.gov.ae/en/open-data/", notes: "Statistical reports, dashboards, and publication plan." }),
  src({ id: "moet_open_data", name_en: "Ministry of Economy and Tourism Open Data", name_ar: "البيانات المفتوحة لوزارة الاقتصاد والسياحة", owner: "Ministry of Economy and Tourism", category: "economy", kind: "metadata", base_url: "https://www.moet.gov.ae/", docs_url: "https://www.moet.gov.ae/en/open-data", notes: "Economic indicators, trade and investment open-data surfaces." }),
  src({ id: "moei_open_data", name_en: "Ministry of Energy and Infrastructure Open Data", name_ar: "البيانات المفتوحة لوزارة الطاقة والبنية التحتية", owner: "Ministry of Energy and Infrastructure", category: "infrastructure", kind: "metadata", base_url: "https://opendata.moei.gov.ae/", docs_url: "https://opendata.moei.gov.ae/", notes: "Energy, infrastructure and geodata surfaces from MOEI." }),
  src({ id: "cbuae_open_data", name_en: "Central Bank of the UAE Open Data", name_ar: "البيانات المفتوحة لمصرف الإمارات المركزي", owner: "Central Bank of the UAE", category: "finance", kind: "metadata", base_url: "https://www.centralbank.ae/", docs_url: "https://www.centralbank.ae/en/open-data-landing/", notes: "Central-bank open-data landing page." }),
  src({ id: "ajman_data_portal", name_en: "Ajman Data Portal", name_ar: "بوابة بيانات عجمان", owner: "Government of Ajman", category: "emirate_catalogue", kind: "ods", base_url: "https://data.ajman.ae/", docs_url: "https://data.ajman.ae/pages/homepage/", notes: "OpenDataSoft Explore v2.1 portal (verified live: 211 datasets). Use dataset discovery, then fetch records per dataset.", connector_config: { api_base: "https://data.ajman.ae/api/explore/v2.1" } }),
  src({ id: "rak_municipality_open_data", name_en: "Ras Al Khaimah Municipality Open Data", name_ar: "البيانات المفتوحة لبلدية رأس الخيمة", owner: "Ras Al Khaimah Municipality", category: "municipality", kind: "metadata", base_url: "https://mun.rak.ae/", docs_url: "https://mun.rak.ae/home/open-data/", notes: "Ras Al Khaimah Municipality open-data surface." }),
  src({ id: "uae_government_open_data", name_en: "UAE Government Open Data", name_ar: "البيانات الحكومية المفتوحة في الإمارات", owner: "UAE Government Official Portal", category: "policy", kind: "metadata", base_url: "https://u.ae/", docs_url: "https://u.ae/en/about-the-uae/digital-uae/data/open-government-data", notes: "Official UAE government page on open government data." }),
  src({ id: "moce_open_data", name_en: "Ministry of Community Empowerment Open Data", name_ar: "البيانات المفتوحة لوزارة تمكين المجتمع", owner: "Ministry of Community Empowerment", category: "society", kind: "metadata", base_url: "https://www.moce.gov.ae/", docs_url: "https://www.moce.gov.ae/en/open-data", notes: "Community, non-profit and social-sector open-data references." }),
  src({ id: "dubai_municipality_open_data", name_en: "Dubai Municipality Open Data", name_ar: "البيانات المفتوحة لبلدية دبي", owner: "Dubai Municipality", category: "municipality", kind: "metadata", base_url: "https://www.dm.gov.ae/", docs_url: "https://www.dm.gov.ae/open-data2/", notes: "Dubai Municipality civic, municipal and city-service datasets." }),
  src({ id: "dubai_customs_open_data", name_en: "Dubai Customs Open Data", name_ar: "البيانات المفتوحة لجمارك دبي", owner: "Dubai Customs", category: "trade", kind: "metadata", base_url: "https://www.dubaicustoms.gov.ae/", docs_url: "https://www.dubaicustoms.gov.ae/en/OpenData/Pages/default.aspx", notes: "Dubai Customs data registers and open-data publishing surface." }),
  src({ id: "dubai_police_open_data", name_en: "Dubai Police Open Data", name_ar: "البيانات المفتوحة لشرطة دبي", owner: "Dubai Police", category: "public_safety", kind: "metadata", base_url: "https://www.dubaipolice.gov.ae/", docs_url: "https://www.dubaipolice.gov.ae/app/home/opendata", notes: "Dubai Police open-data portal for public-safety datasets." }),
  src({ id: "dubai_culture_open_data", name_en: "Dubai Culture Open Data", name_ar: "البيانات المفتوحة لهيئة الثقافة والفنون في دبي", owner: "Dubai Culture and Arts Authority", category: "culture", kind: "metadata", base_url: "https://dubaiculture.gov.ae/", docs_url: "https://dubaiculture.gov.ae/en/about-us/open-data", notes: "Dubai Culture open data for cultural services, libraries and events." }),
  src({ id: "doh_abu_dhabi_open_data", name_en: "Department of Health Abu Dhabi Open Data", name_ar: "البيانات المفتوحة لدائرة الصحة أبوظبي", owner: "Department of Health Abu Dhabi", category: "health", kind: "metadata", base_url: "https://www.doh.gov.ae/", docs_url: "https://www.doh.gov.ae/resources/opendata", notes: "Abu Dhabi health open-data dashboards and resources." }),
  src({ id: "abu_dhabi_sdi_open_data", name_en: "Abu Dhabi Spatial Data Infrastructure", name_ar: "البنية التحتية للبيانات المكانية في أبوظبي", owner: "Abu Dhabi Spatial Data Infrastructure", category: "geospatial", kind: "metadata", base_url: "https://sdi.gov.abudhabi/", docs_url: "https://sdi.gov.abudhabi/", notes: "Geospatial data and standards. Dataset licensing varies per layer." }),
  src({ id: "ajman_ded_open_data", name_en: "Ajman Department of Economic Development Open Data", name_ar: "البيانات المفتوحة لدائرة التنمية الاقتصادية في عجمان", owner: "Ajman Department of Economic Development", category: "economy", kind: "metadata", base_url: "https://www.ajmanded.ae/", docs_url: "https://www.ajmanded.ae/en/open-data/ajded-open-data", notes: "Ajman economic-development open-data for business and public datasets." }),
  src({ id: "scad_abu_dhabi", name_en: "Statistics Centre Abu Dhabi (SCAD)", name_ar: "مركز الإحصاء - أبوظبي", owner: "Statistics Centre Abu Dhabi", category: "statistics", kind: "metadata", base_url: "https://www.scad.gov.ae/", docs_url: "https://www.scad.gov.ae/", notes: "Official statistics for the Emirate of Abu Dhabi." }),
  src({ id: "dubai_statistics_center", name_en: "Dubai Statistics Center", name_ar: "مركز دبي للإحصاء", owner: "Dubai Statistics Center", category: "statistics", kind: "metadata", base_url: "https://www.dsc.gov.ae/", docs_url: "https://www.dsc.gov.ae/", notes: "Official statistics for the Emirate of Dubai." }),
  src({ id: "rta_dubai_open_data", name_en: "Roads and Transport Authority (Dubai) Open Data", name_ar: "البيانات المفتوحة لهيئة الطرق والمواصلات - دبي", owner: "Roads and Transport Authority", category: "transport", kind: "metadata", base_url: "https://www.rta.ae/", docs_url: "https://www.rta.ae/wps/portal/rta/ae/open-data", notes: "Dubai transport, roads and mobility open-data surface." }),
  src({ id: "dewa_open_data", name_en: "Dubai Electricity and Water Authority Open Data", name_ar: "البيانات المفتوحة لهيئة كهرباء ومياه دبي", owner: "Dubai Electricity and Water Authority", category: "utilities", kind: "metadata", base_url: "https://www.dewa.gov.ae/", docs_url: "https://www.dewa.gov.ae/en/about-us/open-data", notes: "Utilities open data. Automated health checks may be blocked by bot mitigation." }),
  src({ id: "mohap_open_data", name_en: "Ministry of Health and Prevention Open Data", name_ar: "البيانات المفتوحة لوزارة الصحة ووقاية المجتمع", owner: "Ministry of Health and Prevention", category: "health", kind: "metadata", base_url: "https://mohap.gov.ae/", docs_url: "https://mohap.gov.ae/en/open-data", notes: "Federal health open-data surface." }),
  src({ id: "mohap_health_core_indicators_2024", name_en: "UAE Health Core Indicators 2024", name_ar: "المؤشرات الصحية الأساسية في الإمارات 2024", owner: "Ministry of Health and Prevention", category: "health", kind: "xlsx", base_url: MOHAP_HEALTH_CORE_INDICATORS_2024_XLSX, docs_url: "https://mohap.gov.ae/en/open-data/mohap-open-data", license: "Published by MOHAP for public use, distribution and sharing under the UAE government open-data policy; attribution required.", notes: "Official source-native health indicator rows. The published 2024 workbook currently exposes year columns through 2023 and contains mixed ratio/percentage scales; UAEMCP preserves values without undocumented normalization.", connector_config: { sheet: 1, header_row: 7, data_start_row: 8 } }),
  src({ id: "mohap_health_facilities_2024", name_en: "UAE Health Facilities Report 2015–2024", name_ar: "تقرير المنشآت الصحية في الإمارات 2015–2024", owner: "Ministry of Health and Prevention", category: "health", kind: "xlsx", base_url: MOHAP_HEALTH_FACILITIES_2024_XLSX, docs_url: "https://mohap.gov.ae/en/open-data/mohap-open-data", license: "Dataset-level licence status is unknown; the MOHAP open-data policy and attribution requirements apply.", notes: "Official aggregate facility-count rows by year, emirate, sector, category and type. The 950 rows are not individual facilities; repeated coordinates are emirate reference points, not facility locations. Embedded metadata says 2015–2022/updated 2022 while the data sheet includes 2023–2024.", connector_config: { sheet: 3, header_row: 7, data_start_row: 8 } }),
  src({ id: "mohap_health_facilities_metadata_2026", name_en: "MOHAP Health Facilities Dataset Metadata 2026", name_ar: "البيانات الوصفية لمنشآت الصحة 2026", owner: "Ministry of Health and Prevention", category: "health", kind: "xlsx", base_url: MOHAP_HEALTH_FACILITIES_2026_XLSX, docs_url: "https://mohap.gov.ae/en/open-data/mohap-open-data", license: "Published by MOHAP for public use, distribution and sharing; attribution required.", notes: "Verified official XLSX. Despite the download title, sheet 1 currently contains 12 bilingual metadata fields describing the dataset, not facility coordinates. UAEMCP reports the published content as-is.", connector_config: { sheet: 1 } }),
  src({ id: "mohap_health_facilities_gis_2026", name_en: "UAE Health Facilities GIS 2026", name_ar: "خريطة المنشآت الصحية في الإمارات 2026", owner: "Ministry of Health and Prevention", category: "health_geospatial", kind: "xlsx", base_url: MOHAP_HEALTH_FACILITIES_2026_XLSX, docs_url: "https://mohap.gov.ae/en/open-data/mohap-open-data", license: "Published by MOHAP for public use, distribution and sharing; attribution required.", notes: "Official 15,326-row GIS sheet. Only coordinates inside conservative UAE bounds (latitude 22–27, longitude 51–57) are exposed; blank, 90,90 sentinel, Excel serial and other invalid values remain excluded. Names and points do not establish type, licensing, quality or capacity.", max_page_size: 16000, connector_config: { sheet: 2, header_row: 4, data_start_row: 5, row_limit: 15326, timeout_ms: 30000 } }),
  src({ id: "tdra_open_data", name_en: "TDRA Open Data", name_ar: "البيانات المفتوحة للهيئة العامة لتنظيم الاتصالات والحكومة الرقمية", owner: "Telecommunications and Digital Government Regulatory Authority", category: "digital", kind: "metadata", base_url: "https://tdra.gov.ae/", docs_url: "https://tdra.gov.ae/en/open-data", notes: "Telecom and digital-government regulator open-data surface." }),
  src({ id: "tdra_active_mobile_subscriptions_2025", name_en: "UAE Active Mobile Subscriptions 2011–2025", name_ar: "اشتراكات الهاتف المتحرك الفعالة في الإمارات 2011–2025", owner: "Telecommunications and Digital Government Regulatory Authority", category: "digital_connectivity", kind: "xlsx", base_url: TDRA_ACTIVE_MOBILE_2025_XLSX, docs_url: "https://tdra.gov.ae/en/open-data/data-sets", license: TDRA_OPEN_DATA_LICENSE, notes: "Official monthly subscription counts. Subscriptions are not unique people, users or devices.", connector_config: { sheet: 1, redaction_exempt_fields: ["Active Mobile Subscriptions[ii]"] } }),
  src({ id: "tdra_broadband_per_100_2025", name_en: "UAE Broadband Internet Subscriptions per 100 Inhabitants 2011–2025", name_ar: "اشتراكات الإنترنت عريض النطاق لكل 100 نسمة في الإمارات 2011–2025", owner: "Telecommunications and Digital Government Regulatory Authority", category: "digital_connectivity", kind: "xlsx", base_url: TDRA_BROADBAND_PER_100_2025_XLSX, docs_url: "https://tdra.gov.ae/en/open-data/data-sets", license: TDRA_OPEN_DATA_LICENSE, notes: "Official monthly source-published subscriptions-per-100 series. It is not a measure of coverage, speed, quality or affordability.", connector_config: { sheet: 1, redaction_exempt_fields: ["Broadband Internet Subscriptions per 100 inhabitants"] } }),
  src({ id: "tdra_fixed_lines_per_100_2025", name_en: "UAE Fixed Lines per 100 Inhabitants 2011–2025", name_ar: "الخطوط الثابتة لكل 100 نسمة في الإمارات 2011–2025", owner: "Telecommunications and Digital Government Regulatory Authority", category: "digital_connectivity", kind: "xlsx", base_url: TDRA_FIXED_LINES_PER_100_2025_XLSX, docs_url: "https://tdra.gov.ae/en/open-data/data-sets", license: TDRA_OPEN_DATA_LICENSE, notes: "Official monthly source-published fixed-lines-per-100 series. It is not a measure of household coverage or service quality.", connector_config: { sheet: 1, redaction_exempt_fields: ["Fixed lines per 100 inhabitants"] } }),
  src({ id: "fta_open_data", name_en: "Federal Tax Authority Open Data", name_ar: "البيانات المفتوحة للهيئة الاتحادية للضرائب", owner: "Federal Tax Authority", category: "finance", kind: "metadata", base_url: "https://tax.gov.ae/", docs_url: "https://tax.gov.ae/en/open.data.aspx", notes: "Federal tax open-data and statistics surface." }),
  src({ id: "fta_selected_services_2017_2022", name_en: "FTA Selected Services 2017–2022", name_ar: "خدمات مختارة للهيئة الاتحادية للضرائب 2017–2022", owner: "Federal Tax Authority", category: "tax", kind: "xlsx", base_url: "https://tax.gov.ae/Datafolder/Files/open-data/2022/Selected%20Services%20Results%202022%20Jan%20to%20Dec%20.xlsx", docs_url: "https://tax.gov.ae/en/open.data/open.data.aspx", license: "Published by the UAE Federal Tax Authority as open data; attribution and the FTA Open Data Policy apply.", notes: "Official historical table for five selected services only. It is not a complete measure of all FTA service activity, and VAT Registrants must not be assumed equivalent to later VAT Registration activity.", connector_config: { sheet: 1 } }),
  src({ id: "fta_service_activity_2024", name_en: "FTA Service Activity 2024", name_ar: "نشاط خدمات الهيئة الاتحادية للضرائب 2024", owner: "Federal Tax Authority", category: "tax", kind: "xlsx", base_url: "https://tax.gov.ae/Datafolder/Files/open-data/2025/open%20data%202024%20-%2017%20services-%20Monthly%20bases-Julani-amended-latest.xlsx", docs_url: "https://tax.gov.ae/en/open.data/open.data.aspx", license: "Published by the UAE Federal Tax Authority as open data; attribution and the FTA Open Data Policy apply.", notes: "Official source-native monthly table with 17 service rows, including a duplicate service label. The workbook has an unlabelled column after March; UAEMCP preserves that column explicitly and does not calculate an annual total or year-over-year trend.", connector_config: { sheet: 1, header_row: 2, data_start_row: 4, row_limit: 17, columns: { Service: "B", Jan: "C", Feb: "D", Mar: "E", Unlabelled_After_Mar: "F", Apr: "G", May: "H", Jun: "I", Jul: "J", Aug: "K", Sep: "L", Oct: "M", Nov: "N", Dec: "O" } } }),
  src({ id: "fta_service_activity_2025", name_en: "FTA Service Activity 2025", name_ar: "إحصاءات نشاط خدمات الهيئة الاتحادية للضرائب 2025", owner: "Federal Tax Authority", category: "tax", kind: "xlsx", base_url: "https://tax.gov.ae/Datafolder/Files/Pdf/2026/open-data/Open%20data%202025%20full%20year%20-%20final.xlsx", docs_url: "https://tax.gov.ae/en/open.data/open.data.aspx", license: "Published by the UAE Federal Tax Authority as open data; verify the FTA Open Data Policy and source terms before redistribution.", notes: "Official 2025 annual service-activity table. Only its 10-row annual table at physical rows 6–15 is exposed; the differently structured monthly table embedded below it is intentionally excluded. Counts are service activity, not revenue or taxpayer totals.", connector_config: { sheet: 1, header_row: 5, data_start_row: 6, row_limit: 10 } }),
  src({ id: "dha_dubai_open_data", name_en: "Dubai Health Authority Open Data", name_ar: "البيانات المفتوحة لهيئة الصحة بدبي", owner: "Dubai Health Authority", category: "health", kind: "metadata", base_url: "https://www.dha.gov.ae/", docs_url: "https://www.dha.gov.ae/en/open-data", notes: "Dubai health-sector open-data surface." }),
  src({ id: "ead_abu_dhabi_open_data", name_en: "Environment Agency Abu Dhabi Open Data", name_ar: "البيانات المفتوحة لهيئة البيئة - أبوظبي", owner: "Environment Agency Abu Dhabi", category: "environment", kind: "metadata", base_url: "https://www.ead.gov.ae/", docs_url: "https://www.ead.gov.ae/en/resources/open-data", notes: "Environment, biodiversity and air-quality open-data resources." }),
  src({ id: "sharjah_open_data", name_en: "Government of Sharjah Open Data", name_ar: "البيانات المفتوحة لحكومة الشارقة", owner: "Government of Sharjah", category: "emirate_catalogue", kind: "metadata", base_url: "https://www.sharjah.gov.ae/", docs_url: "https://www.sharjah.gov.ae/", notes: "Sharjah government portal and open-data entry point." }),
  src({ id: "dof_dubai_open_data", name_en: "Dubai Department of Finance Open Data", name_ar: "البيانات المفتوحة لدائرة المالية - حكومة دبي", owner: "Dubai Department of Finance", category: "finance", kind: "metadata", base_url: "https://www.dof.gov.ae/", docs_url: "https://www.dof.gov.ae/", notes: "Dubai public-finance open-data surface." }),
];

const REQUIRED_CUSTOM = ["id", "name_en", "name_ar", "owner", "base_url"] as const;

const STORE_PATH =
  process.env.UAEMCP_DATA_FILE ?? join(homedir(), ".uaemcp", "custom_sources.json");

export class Registry {
  private builtIn = new Map<string, Source>();
  private custom = new Map<string, Source>();
  private storePath: string;

  constructor(storePath = STORE_PATH) {
    this.storePath = storePath;
    for (const s of BUILT_IN) this.builtIn.set(s.id, s);
    this.loadCustom();
  }

  private loadCustom(): void {
    if (!existsSync(this.storePath)) return;
    try {
      const raw = JSON.parse(readFileSync(this.storePath, "utf-8")) as Partial<Source>[];
      for (const item of raw) {
        if (item.id && !this.builtIn.has(item.id)) {
          this.custom.set(
            item.id,
            {
              connector_config: {},
              requires_api_key: false,
              api_docs: "",
              access_status: "metadata_only",
              ...item,
              origin: "custom",
            } as Source,
          );
        }
      }
    } catch {
      /* ignore a corrupt store */
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.storePath), { recursive: true });
    writeFileSync(
      this.storePath,
      JSON.stringify([...this.custom.values()], null, 2),
      "utf-8",
    );
  }

  list(): Source[] {
    return [...this.builtIn.values(), ...this.custom.values()];
  }

  get(id: string): Source {
    const s = this.builtIn.get(id) ?? this.custom.get(id);
    if (!s) throw new SourceNotFound(`unknown source: ${id}`);
    return s;
  }

  addMetadataSource(data: Record<string, string>): Source {
    return this.addSource({
      id: data.id, name_en: data.name_en, name_ar: data.name_ar, owner: data.owner,
      base_url: data.base_url, category: data.category, docs_url: data.docs_url,
      notes: data.notes, kind: "metadata",
    });
  }

  addSource(data: CustomSourceInput): Source {
    const missing = REQUIRED_CUSTOM.filter((k) => !data[k]);
    if (missing.length) {
      throw new ValidationError(`missing required fields: ${missing.join(", ")}`);
    }
    const id = String(data.id).trim();
    if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(id)) throw new ValidationError("source id must be 2-64 lowercase letters, digits, _ or -");
    if (this.builtIn.has(id)) {
      throw new ValidationError(`cannot override built-in source: ${id}`);
    }
    let baseUrl: URL;
    try { baseUrl = new URL(data.base_url); } catch { throw new ValidationError("base_url must be a valid URL"); }
    if (!["http:", "https:"].includes(baseUrl.protocol)) throw new ValidationError("base_url must use http or https");
    const kind = String(data.kind ?? "metadata") as SourceKind;
    if (!/^[a-z][a-z0-9_-]{1,31}$/.test(kind)) throw new ValidationError("invalid connector kind");
    const source: Source = src({
      id,
      name_en: data.name_en,
      name_ar: data.name_ar,
      owner: data.owner,
      category: data.category || "custom",
      kind,
      base_url: baseUrl.toString(),
      endpoint: data.endpoint || "",
      docs_url: data.docs_url || "",
      license: data.license || LICENSE,
      notes: data.notes || "",
      row_path: data.row_path ?? [],
      default_params: data.default_params ?? {},
      connector_config: data.connector_config ?? {},
      max_page_size: data.max_page_size ?? null,
      access_status: kind === "metadata" ? "metadata_only" : "live",
      origin: "custom",
    });
    this.custom.set(id, source);
    this.persist();
    return source;
  }
}

export const REGISTRY = new Registry();
