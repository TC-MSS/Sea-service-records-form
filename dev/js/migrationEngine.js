/**
 * Migration engine — converts saved records to schema 0.5.0.
 *
 * Supported inputs:
 *  - pre-0.4 records (boolean polar / ice / dp / offshore / tanker fields,
 *    positionVerified / seaServiceVerified examiner flags);
 *  - 0.4.0 records saved by the production index.html (key "SeaServiceRecord");
 *  - 0.5.0 records (normalised: missing fields are filled with defaults).
 *
 * Original legacy flags are preserved in voyage.metadata.legacyFields so that
 * nothing entered under an older version is lost.
 */
import { createVoyage, createSeaServiceRecord, createExaminerReview, fillDefaults, SCHEMA_VERSION, APPLICATION_VERSION } from "./dataModel.js";
import { reserveConvertedDays, toNumberOrNull, updateCandidateDays, updateExaminerBasis } from "./calculationEngine.js";

const LEGACY_VOYAGE_FLAGS = [
  "positionVerified", "seaServiceVerified", "tanker", "tankerService", "oilTanker", "chemicalTanker", "lngTanker",
  "polar", "polarWaters", "ice", "iceNavigation", "dp", "dynamicPositioning", "offshore", "offshoreService"
];
const LEGACY_RECORD_FLAGS = ["positionVerified", "seaServiceVerified", "examinerComments"];

const truthy = (v) => v === true || v === "true" || v === 1 || v === "1" || v === "on";

export function legacyIceService(v) {
  if (v.iceService) return v.iceService;
  const polar = truthy(v.polar) || truthy(v.polarWaters);
  const ice = truthy(v.ice) || truthy(v.iceNavigation);
  return polar && ice ? "POLAR_AND_ACCEPTABLE_ICE" : polar ? "POLAR" : ice ? "ACCEPTABLE_ICE" : "NONE";
}

export function legacyDpOffshore(v) {
  if (v.dpOffshoreService) return v.dpOffshoreService;
  if (typeof v.dpOffshore === "string" && v.dpOffshore) return v.dpOffshore;
  const dp = truthy(v.dp) || truthy(v.dynamicPositioning);
  const offshore = truthy(v.offshore) || truthy(v.offshoreService);
  return dp && offshore ? "DP_AND_OFFSHORE" : dp ? "DP" : offshore ? "OFFSHORE" : "NONE";
}

export function legacyTransferOperation(v) {
  if (v.transferOperation) return v.transferOperation;
  if (truthy(v.oilTanker) || truthy(v.oilTransfer)) return "OIL_TRANSFER";
  if (truthy(v.chemicalTanker) || truthy(v.chemicalTransfer)) return "CHEMICAL_TRANSFER";
  if (truthy(v.lngTanker) || truthy(v.gasTransfer)) return "GAS_TRANSFER";
  return "NONE";
}

function pickLegacy(source, keys) {
  const out = {};
  for (const k of keys) if (source[k] !== undefined) out[k] = source[k];
  return out;
}

export function migrateVoyageToV050(old = {}, sequenceNumber = 1) {
  const v = createVoyage(sequenceNumber);
  v.vessel = {
    ...v.vessel,
    vesselName: old.vessel || old.vesselName || "",
    identifierType: old.idType || old.identifierType || "OFFICIAL",
    identifierNumber: old.identifier || old.identifierNumber || "",
    vesselTypeCode: old.vesselType || old.vesselTypeCode || "",
    grossTonnage: toNumberOrNull(old.gt ?? old.grossTonnage),
    propulsionPowerKw: toNumberOrNull(old.kw ?? old.propulsionPowerKw),
    propulsionType: old.propulsion || old.propulsionType || "",
    voyageClassification: old.voyage || old.voyageClass || "",
    portOrCountryOfRegistry: old.registry || old.portOrCountryOfRegistry || ""
  };
  v.service.capacityCode = old.rank || old.capacityCode || "";
  v.service.watchHours = toNumberOrNull(old.watch ?? old.watchHours);

  v.dates.embarkationDate = old.embark || old.engagementDate || null;
  v.dates.disembarkationDate = old.disembark || old.dischargeDate || null;
  v.dates.daysOnBoard = toNumberOrNull(old.daysOnBoard ?? old.days ?? old.seaTimeDays);
  // Production 0.4.0 saves daysAtSea = daysOnBoard when the candidate left it blank.
  const atSea = toNumberOrNull(old.daysAtSea);
  v.dates.daysAtSeaEntered = atSea !== null && atSea === v.dates.daysOnBoard ? null : atSea;
  updateCandidateDays(v);

  v.specializedService = {
    ...v.specializedService,
    iceService: legacyIceService(old),
    passengerService: truthy(old.passenger ?? old.passengerService),
    transferOperation: legacyTransferOperation(old),
    fishingService: truthy(old.fishing ?? old.fishingService),
    dpOffshoreService: legacyDpOffshore(old)
  };
  const tanker = truthy(old.tanker) || truthy(old.tankerService);
  if (tanker && v.specializedService.transferOperation === "NONE") v.metadata.legacyWarnings.push("TRANSFER_OPERATION_TYPE_REQUIRED");

  // Examiner verification flags: new names win, legacy names are the fallback.
  v.examinerReview.capacityVerified = truthy(old.capacityVerified ?? old.positionVerified);
  v.examinerReview.specializedServiceVerified = truthy(old.specializedServiceVerified ?? old.seaServiceVerified);

  reserveConvertedDays(v);
  updateExaminerBasis(v);
  v.metadata.legacyFields = pickLegacy(old, LEGACY_VOYAGE_FLAGS);
  v.metadata.legacyFieldsConverted = true;
  return v;
}

/** Normalise a 0.5.0 voyage: fill missing fields, keep converted days null if absent. */
export function normaliseVoyage(v, sequenceNumber) {
  const template = createVoyage(sequenceNumber);
  fillDefaults(v, template);
  fillDefaults(v.examinerReview, createExaminerReview());
  if (v.calculation.convertedDays === undefined || v.calculation.convertedDays === "") v.calculation.convertedDays = null;
  if (v.calculation.conversionStatus !== "CALCULATED") v.calculation.convertedDays = null;
  updateCandidateDays(v);
  updateExaminerBasis(v);
  return v;
}

export function migrateRecordToV050(old = {}) {
  if (old && old.schemaVersion === SCHEMA_VERSION) {
    const r = old;
    fillDefaults(r, createSeaServiceRecord(r.language || "en"));
    r.voyages = (r.voyages || []).map((v, i) => normaliseVoyage(v, i + 1));
    return r;
  }
  const r = createSeaServiceRecord(old.language || "en");
  r.recordId = old.recordId || r.recordId;
  r.candidate = {
    ...r.candidate,
    surname: old.surname || old.candidate?.surname || "",
    givenNames: old.givenNames || old.candidate?.givenNames || "",
    cdnNumber: old.cdn || old.candidate?.cdnNumber || "",
    declarationAccepted: truthy(old.applicantDeclaration ?? old.candidate?.declarationAccepted)
  };
  r.application.applicationDate = old.applicationDate || old.application?.applicationDate || null;
  r.application.certificateAppliedFor.code = old.certificate || old.application?.certificateAppliedFor?.code || "";
  r.application.certificateHeld.code = old.certificateHeld || old.application?.certificateHeld?.code || "";
  r.examinerAssessment.generalComments = old.examinerComments || "";
  r.voyages = (old.voyages || []).map((v, i) => migrateVoyageToV050(v, i + 1));
  r.migration = {
    fromSchemaVersion: old.schemaVersion || "pre-0.4",
    migratedAt: new Date().toISOString(),
    applicationVersion: APPLICATION_VERSION,
    legacyRecordFields: pickLegacy(old, LEGACY_RECORD_FLAGS)
  };
  r.auditTrail.push({ at: r.migration.migratedAt, action: "MIGRATED_TO_0_5_0", from: r.migration.fromSchemaVersion });
  return r;
}
