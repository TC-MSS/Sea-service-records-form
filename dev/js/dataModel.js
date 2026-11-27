export const SCHEMA_VERSION = "0.5.0";
export const APPLICATION_VERSION = "1.0.0";

export const ENUMS = Object.freeze({
  recordStatus: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ADDITIONAL_INFORMATION_REQUIRED", "ASSESSMENT_COMPLETED", "CLOSED"],
  departments: ["DECK", "ENGINE", "OTHER"],
  identifierTypes: ["OFFICIAL", "IMO", "OTHER"],
  propulsionTypes: ["MOTOR", "STEAM", "DIESEL_ELECTRIC", "OTHER"],
  iceService: ["NONE", "POLAR", "ACCEPTABLE_ICE", "POLAR_AND_ACCEPTABLE_ICE"],
  /** v0.7.0 — column K conditions; several may be selected, each with its own number of days. */
  iceConditions: ["POLAR", "ACCEPTABLE_ICE"],
  /** v1.0.0 — column M conditions; several may be selected, each with its own number of days. */
  transferConditions: ["OIL_TRANSFER", "CHEMICAL_TRANSFER", "GAS_TRANSFER"],
  /** v1.0.0 — review status per special service (examiner). "" = not yet chosen. */
  serviceReviewStatus: ["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT", "REJECTED"],
  transferOperation: ["NONE", "OIL_TRANSFER", "CHEMICAL_TRANSFER", "GAS_TRANSFER"],
  dpOffshoreService: ["NONE", "DP", "OFFSHORE", "DP_AND_OFFSHORE"],
  conversionStatus: ["NOT_CALCULATED", "NOT_APPLICABLE", "CALCULATED", "MANUAL_REVIEW_REQUIRED", "CALCULATION_ERROR"],
  calculationSource: ["DAYS_ON_BOARD", "DAYS_AT_SEA", "OTHER"],
  reviewStatus: ["NOT_REVIEWED", "ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT", "ADDITIONAL_INFORMATION_REQUIRED", "REJECTED"],
  examinerBasis: ["NONE", "DAYS_ON_BOARD", "DAYS_AT_SEA", "CONVERTED_DAYS", "MANUAL_DETERMINATION"],
  examinerBasisSelectable: ["DAYS_ON_BOARD", "DAYS_AT_SEA", "CONVERTED_DAYS", "MANUAL_DETERMINATION"],
  assessmentStatus: ["NOT_STARTED", "IN_PROGRESS", "PENDING_INFORMATION", "COMPLETED"],
  assessmentConclusion: ["NOT_DETERMINED", "REQUIREMENT_MET", "REQUIREMENT_NOT_MET", "ASSESSMENT_INCOMPLETE", "ADDITIONAL_INFORMATION_REQUIRED"]
});

export function createId(prefix = "ID") {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid}`;
}

export function createExaminerReview() {
  return {
    reviewStatus: "NOT_REVIEWED",
    vesselVerified: false,
    capacityVerified: false,
    datesVerified: false,
    specializedServiceVerified: false,
    supportingDocumentsVerified: false,
    examinerBasis: "NONE",
    basisDays: null,
    finalAcceptedDays: null,
    // v0.7.0 — the value the final days are compared with: the selected basis,
    // or the calculated converted days when no basis is selected.
    referenceDays: null,
    referenceSource: null,
    // v0.7.0 — the figure counted in the examiner totals for this line.
    effectiveAcceptedDays: 0,
    acceptedDaysSource: "NONE",
    statusSetAutomatically: false,
    // v0.9.0 — examiner vetting of ice and transfer-operation days, per service code.
    serviceReview: {},
    adjustmentRequired: false,
    adjustmentReasonCode: null,
    adjustmentReason: "",
    examinerComments: "",
    reviewedBy: null,
    reviewedAt: null,
    outstandingIssues: []
  };
}

/** Column K (v0.7.0): one entry per ice condition — selected flag and days in that condition. */
export function createIceConditions() {
  return Object.fromEntries(ENUMS.iceConditions.map((code) => [code, { selected: false, days: null }]));
}

/** Combined legacy code (NONE / POLAR / ACCEPTABLE_ICE / POLAR_AND_ACCEPTABLE_ICE) from the conditions. */
export function iceServiceFromConditions(conditions = {}) {
  const polar = Boolean(conditions.POLAR?.selected);
  const ice = Boolean(conditions.ACCEPTABLE_ICE?.selected);
  return polar && ice ? "POLAR_AND_ACCEPTABLE_ICE" : polar ? "POLAR" : ice ? "ACCEPTABLE_ICE" : "NONE";
}

/** Conditions from a legacy combined code (days unknown → null). */
export function iceConditionsFromService(code = "NONE") {
  const c = createIceConditions();
  if (code === "POLAR" || code === "POLAR_AND_ACCEPTABLE_ICE") c.POLAR.selected = true;
  if (code === "ACCEPTABLE_ICE" || code === "POLAR_AND_ACCEPTABLE_ICE") c.ACCEPTABLE_ICE.selected = true;
  return c;
}

/** Column M (v1.0.0): one entry per transfer type — selected flag and days of transfer operations. */
export function createTransferConditions() {
  return Object.fromEntries(ENUMS.transferConditions.map((code) => [code, { selected: false, days: null }]));
}

/** Single legacy code (first selected type, or NONE), kept in step for older tools. */
export function transferOperationFromConditions(conditions = {}) {
  return ENUMS.transferConditions.find((code) => conditions[code]?.selected) || "NONE";
}

/** Conditions from the legacy single code (days unknown → null). */
export function transferConditionsFromOperation(code = "NONE") {
  const c = createTransferConditions();
  if (c[code]) c[code].selected = true;
  return c;
}

export function createVoyage(sequenceNumber = 1) {
  const now = new Date().toISOString();
  return {
    voyageId: createId("VOY"),
    sequenceNumber,
    vessel: {
      vesselName: "", identifierType: "OFFICIAL", identifierNumber: "",
      vesselTypeCode: "", vesselTypeOther: "", grossTonnage: null,
      propulsionPowerKw: null, propulsionType: "", voyageClassification: "",
      portOrCountryOfRegistry: ""
    },
    service: { capacityCode: "", capacityOther: "", department: "", watchHours: null, descriptionOfDuties: "" },
    dates: {
      embarkationDate: null, disembarkationDate: null, daysOnBoard: null,
      daysAtSeaEntered: null, daysAtSeaEffective: null, daysAtSeaDifferent: false
    },
    specializedService: {
      iceService: "NONE", iceConditions: createIceConditions(), passengerService: false, transferOperation: "NONE", transferConditions: createTransferConditions(),
      fishingService: false, dpOffshoreService: "NONE", supportingDetails: ""
    },
    calculation: {
      sourceType: null, sourceDays: null, conversionStatus: "NOT_CALCULATED",
      conversionRate: null, convertedDays: null, convertedDaysExact: null, overlaps: [], calculationRuleId: null,
      calculationRuleVersion: null, legalReference: { document: null, section: null },
      explanationEn: "", explanationFr: "", warnings: [], errors: []
    },
    examinerReview: createExaminerReview(),
    metadata: { enteredBy: "CANDIDATE", createdAt: now, updatedAt: now, sourceRecordId: null, legacyFieldsConverted: false, legacyWarnings: [], legacyFields: {} }
  };
}

export function createSeaServiceRecord(language = "en") {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    applicationVersion: APPLICATION_VERSION,
    recordId: createId("SSR"),
    recordStatus: "DRAFT",
    language,
    createdAt: now, updatedAt: now, calculatedAt: null, submittedAt: null, reviewedAt: null,
    candidate: { surname: "", givenNames: "", cdnNumber: "", declarationAccepted: false, declarationDate: null, contactInformation: { email: "", telephone: "" } },
    application: {
      applicationDate: null,
      certificateAppliedFor: { code: "", labelEn: "", labelFr: "" },
      certificateHeld: { code: "", labelEn: "", labelFr: "" },
      applicationNotes: ""
    },
    voyages: [],
    calculationSummary: createEmptySummary(),
    examinerAssessment: {
      assessmentStatus: "NOT_STARTED", certificateAssessed: "", totalFinalAcceptedDays: 0,
      assessmentConclusion: "NOT_DETERMINED", additionalInformationRequired: false,
      additionalInformationDetails: "", generalComments: "",
      examiner: { examinerId: null, examinerName: "", office: "" },
      reviewDate: null,
      startedAt: null, completedAt: null, rulesVersion: null, applicationVersion: APPLICATION_VERSION
    },
    auditTrail: []
  };
}

export function createEmptySummary() {
  return {
    candidateClaim: { totalDaysOnBoard: 0, totalDaysAtSea: 0 },
    automatedCalculation: { totalConvertedDays: null, recordsCalculated: 0, recordsNotCalculated: 0, recordsRequiringManualReview: 0 },
    examinerDetermination: {
      recordsReviewed: 0, recordsNotReviewed: 0, recordsAccepted: 0, recordsAcceptedWithAdjustment: 0, recordsRejected: 0, recordsRequiringInformation: 0,
      totalFinalAcceptedDays: 0, totalFinalAcceptedMonths: 0, differenceFromConverted: null,
      // v0.8.0 — approved days per special service selected on at least one line; overlapping dates counted once.
      specialServiceApprovedDays: {},
      // v0.9.0 — automatic figures for comparison, and which services were adjusted by the examiner.
      specialServiceAutomaticDays: {}, specialServiceAdjusted: {},
      linesWithFinalDays: 0, linesMissingAdjustmentReason: 0
    },
    specializedService: { polarDays: 0, acceptableIceDays: 0, oilTransferDays: 0, chemicalTransferDays: 0, gasTransferDays: 0, passengerServiceDays: 0, fishingServiceDays: 0, dynamicPositioningDays: 0, offshoreServiceDays: 0 },
    capacityService: { masterDays: 0, chiefMateDays: 0, mateDays: 0, supernumeraryMateDays: 0, chiefEngineerDays: 0, secondEngineerDays: 0, engineerOfficerDays: 0 },
    vesselThresholds: { gt500Days: 0, gt3000Days: 0 },
    voyageAreas: { nearCoastalDays: 0, unlimitedDays: 0 },
    warnings: [], errors: []
  };
}

/**
 * Fill any properties missing from `target` with defaults from `defaults`
 * (recursive for plain objects). Existing values, including null, are kept.
 */
export function fillDefaults(target, defaults) {
  if (target === null || typeof target !== "object" || Array.isArray(target)) return target;
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in target)) target[key] = structuredCloneSafe(value);
    else if (value && typeof value === "object" && !Array.isArray(value)) fillDefaults(target[key], value);
  }
  return target;
}

function structuredCloneSafe(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
