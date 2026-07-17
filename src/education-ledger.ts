export const EDUCATION_REPORT_URL = "https://fcsc.gov.ae/wp-content/uploads/2025/12/UAE-Unified-Numbers-En.pdf";
export const EDUCATION_CATALOGUE_URL = "https://admin.bayanat.ae/Home/DatasetInfo?dID=1dHDH5iN6ADu2-M-NAE0n8aY1PCoxgGM7hVVP6E86TI&langKey=en";
export const EDUCATION_REPORT_SHA256 = "a688b6908a9bbeda49a68b6ac50d5d57f1daf9afc97628682f025ccff029c7ea";

type SexSplit = Readonly<{ total: number; female: number; male: number }>;
type Localized = Readonly<{ en: string; ar: string }>;

export interface EducationResource {
  id: string;
  title: Localized;
  period: "2018–2024";
  status: "catalogued";
}

export interface EducationLedger {
  kind: "uae_education_ledger";
  title: Localized;
  period: "2023/2024";
  snapshot: {
    generalEducation: SexSplit;
    educationalPersonnel: SexSplit;
    higherEducation: SexSplit;
    higherEducationPersonnel: SexSplit;
  };
  derived: {
    studentsPerEducationalPersonnel: number;
    femaleShareOfGeneralStudents: number;
    femaleShareOfGeneralPersonnel: number;
  };
  validation: {
    studentSexSplitReconciles: boolean;
    personnelSexSplitReconciles: boolean;
  };
  catalogue: EducationResource[];
  source: {
    publisher: "Federal Competitiveness and Statistics Centre";
    dataOwner: "Ministry of Education";
    delivery: "verified_snapshot";
    citation: string;
    catalogueCitation: string;
    retrievedAt: "2026-07-17";
    sha256: string;
    license: "Creative Commons Attribution 4.0";
  };
  methodology: string[];
  limitations: string[];
}

const resources: readonly EducationResource[] = [
  { id: "teachers_2018_2024", title: { en: "General Education Teachers", ar: "معلمو التعليم العام" }, period: "2018–2024", status: "catalogued" },
  { id: "students_by_sector_2018_2024", title: { en: "Students by sector", ar: "الطلبة حسب القطاع" }, period: "2018–2024", status: "catalogued" },
  { id: "students_by_nationality_2018_2024", title: { en: "Students by nationality", ar: "الطلبة حسب الجنسية" }, period: "2018–2024", status: "catalogued" },
  { id: "staff_2018_2024", title: { en: "General Education staff", ar: "كوادر التعليم العام" }, period: "2018–2024", status: "catalogued" },
  { id: "public_schools_2018_2024", title: { en: "Public schools", ar: "المدارس الحكومية" }, period: "2018–2024", status: "catalogued" },
  { id: "private_schools_2018_2024", title: { en: "Private schools", ar: "المدارس الخاصة" }, period: "2018–2024", status: "catalogued" },
  { id: "grade_12_graduates_2018_2024", title: { en: "Grade 12 graduates", ar: "خريجو الصف الثاني عشر" }, period: "2018–2024", status: "catalogued" },
];

const generalEducation: SexSplit = { total: 1_811_145, female: 890_341, male: 920_804 };
const educationalPersonnel: SexSplit = { total: 162_533, female: 120_876, male: 41_657 };
const higherEducation: SexSplit = { total: 367_651, female: 185_568, male: 182_083 };
const higherEducationPersonnel: SexSplit = { total: 21_326, female: 9_328, male: 11_998 };

const round = (value: number): number => Math.round(value * 1_000) / 1_000;

export function buildEducationLedger(): EducationLedger {
  return {
    kind: "uae_education_ledger",
    title: { en: "UAE Education Ledger", ar: "سجل التعليم في الإمارات" },
    period: "2023/2024",
    snapshot: {
      generalEducation: { ...generalEducation },
      educationalPersonnel: { ...educationalPersonnel },
      higherEducation: { ...higherEducation },
      higherEducationPersonnel: { ...higherEducationPersonnel },
    },
    derived: {
      studentsPerEducationalPersonnel: round(generalEducation.total / educationalPersonnel.total),
      femaleShareOfGeneralStudents: round(generalEducation.female / generalEducation.total),
      femaleShareOfGeneralPersonnel: round(educationalPersonnel.female / educationalPersonnel.total),
    },
    validation: {
      studentSexSplitReconciles: generalEducation.female + generalEducation.male === generalEducation.total,
      personnelSexSplitReconciles: educationalPersonnel.female + educationalPersonnel.male === educationalPersonnel.total,
    },
    catalogue: resources.map((resource) => ({ ...resource, title: { ...resource.title } })),
    source: {
      publisher: "Federal Competitiveness and Statistics Centre",
      dataOwner: "Ministry of Education",
      delivery: "verified_snapshot",
      citation: EDUCATION_REPORT_URL,
      catalogueCitation: EDUCATION_CATALOGUE_URL,
      retrievedAt: "2026-07-17",
      sha256: EDUCATION_REPORT_SHA256,
      license: "Creative Commons Attribution 4.0",
    },
    methodology: [
      "National totals are transcribed from pages 40–41 of the FCSC Unified UAE Numbers report and retained with the report SHA-256.",
      "Female and male values are validated against each published total before derived ratios are calculated.",
      "The Ministry of Education catalogue is exposed as discovery metadata only; it is not merged into the national snapshot.",
    ],
    limitations: [
      "The national snapshot and the seven 2018–2024 catalogue resources are not combined because they have different publication shapes and evidence scopes.",
      "Students per educational personnel is a derived national ratio, not a classroom size or student-to-teacher ratio.",
      "The retained report is a verified snapshot, not a real-time enrollment feed.",
      "Catalogue status proves publication metadata only; it does not prove that each legacy download is currently reachable.",
    ],
  };
}
