import { fetchResult } from "./connectors.js";

export interface RuntimeDependencies {
  fetchIndustryRecords?: typeof fetchResult;
  fetchTaxRecords?: typeof fetchResult;
  fetchTaxArchiveRecords?: typeof fetchResult;
  fetchTradeRecords?: typeof fetchResult;
  fetchAjmanBusinessRecords?: typeof fetchResult;
  fetchAjmanUrbanRecords?: typeof fetchResult;
  fetchHealthRecords?: typeof fetchResult;
  fetchHealthFacilitiesRecords?: typeof fetchResult;
  fetchPlaceRecords?: typeof fetchResult;
}
