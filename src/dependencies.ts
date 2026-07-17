import { fetchResult } from "./connectors.js";
import type { PolicyEvidenceStore } from "./policy-evidence-watch.js";

export interface RuntimeDependencies {
  fetchIndustryRecords?: typeof fetchResult;
  fetchTaxRecords?: typeof fetchResult;
  fetchTaxArchiveRecords?: typeof fetchResult;
  fetchTradeRecords?: typeof fetchResult;
  fetchAjmanBusinessRecords?: typeof fetchResult;
  fetchAjmanUrbanRecords?: typeof fetchResult;
  fetchAjmanParksRecords?: typeof fetchResult;
  fetchHealthRecords?: typeof fetchResult;
  fetchHealthFacilitiesRecords?: typeof fetchResult;
  fetchHealthFacilitiesMapRecords?: typeof fetchResult;
  fetchConnectivityRecords?: typeof fetchResult;
  fetchPlaceRecords?: typeof fetchResult;
  fetchPolicyPage?: (url: string) => Promise<string>;
  policyEvidenceStore?: PolicyEvidenceStore;
}
