import { createVoyage, createSeaServiceRecord } from "./dataModel.js";

function oldIce(v) { return v.iceService || (v.polar && v.ice ? "POLAR_AND_ACCEPTABLE_ICE" : v.polar ? "POLAR" : v.ice ? "ACCEPTABLE_ICE" : "NONE"); }
function oldDp(v) { return v.dpOffshoreService || v.dpOffshore || (v.dp && v.offshore ? "DP_AND_OFFSHORE" : v.dp ? "DP" : v.offshore ? "OFFSHORE" : "NONE"); }

export function migrateVoyageToV050(old = {}, sequenceNumber = 1) {
  const v = createVoyage(sequenceNumber);
  v.vessel = { ...v.vessel, vesselName: old.vessel || old.vesselName || "", identifierType: old.idType || old.identifierType || "OFFICIAL", identifierNumber: old.identifier || old.identifierNumber || "", vesselTypeCode: old.vesselType || old.vesselTypeCode || "", grossTonnage: old.gt ?? old.grossTonnage ?? null, propulsionPowerKw: old.kw ?? old.propulsionPowerKw ?? null, propulsionType: old.propulsion || old.propulsionType || "", voyageClassification: old.voyage || old.voyageClass || "", portOrCountryOfRegistry: old.registry || old.portOrCountryOfRegistry || "" };
  v.service.capacityCode = old.rank || old.capacityCode || "";
  v.service.watchHours = old.watch ?? old.watchHours ?? null;
  v.dates.embarkationDate = old.embark || old.engagementDate || null;
  v.dates.disembarkationDate = old.disembark || old.dischargeDate || null;
  v.dates.daysOnBoard = old.daysOnBoard ?? old.days ?? old.seaTimeDays ?? null;
  v.dates.daysAtSeaEntered = old.daysAtSea ?? null;
  v.dates.daysAtSeaEffective = v.dates.daysAtSeaEntered ?? v.dates.daysOnBoard;
  v.specializedService = { ...v.specializedService, iceService: oldIce(old), passengerService: Boolean(old.passenger ?? old.passengerService), transferOperation: old.transferOperation || "NONE", fishingService: Boolean(old.fishing ?? old.fishingService), dpOffshoreService: oldDp(old) };
  if (old.tanker === true && !old.transferOperation) v.metadata.legacyWarnings.push("TRANSFER_OPERATION_TYPE_REQUIRED");
  v.examinerReview.capacityVerified = old.capacityVerified ?? old.positionVerified ?? false;
  v.examinerReview.specializedServiceVerified = old.specializedServiceVerified ?? old.seaServiceVerified ?? false;
  v.metadata.legacyFieldsConverted = true;
  return v;
}

export function migrateRecordToV050(old = {}) {
  if (old.schemaVersion === "0.5.0") return old;
  const r = createSeaServiceRecord(old.language || "en");
  r.recordId = old.recordId || r.recordId;
  r.candidate = { ...r.candidate, surname: old.surname || old.candidate?.surname || "", givenNames: old.givenNames || old.candidate?.givenNames || "", cdnNumber: old.cdn || old.candidate?.cdnNumber || "", declarationAccepted: Boolean(old.applicantDeclaration ?? old.candidate?.declarationAccepted) };
  r.application.applicationDate = old.applicationDate || old.application?.applicationDate || null;
  r.application.certificateAppliedFor.code = old.certificate || old.application?.certificateAppliedFor?.code || "";
  r.application.certificateHeld.code = old.certificateHeld || old.application?.certificateHeld?.code || "";
  r.voyages = (old.voyages || []).map((v, i) => migrateVoyageToV050(v, i + 1));
  return r;
}
