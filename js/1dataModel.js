export const SCHEMA_VERSION = "0.5.0";
export const APPLICATION_VERSION = "0.5.0";

export const ENUMS = Object.freeze({
  recordStatus: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "ADDITIONAL_INFORMATION_REQUIRED", "ASSESSMENT_COMPLETED", "CLOSED"],
  departments: ["DECK", "ENGINE", "OTHER"],
  identifierTypes: ["OFFICIAL", "IMO", "OTHER"],
  propulsionTypes: ["MOTOR", "STEAM", "DIESEL_ELECTRIC", "OTHER"],
  iceService: ["NONE", "POLAR", "ACCEPTABLE_ICE", "POLAR_AND_ACCEPTABLE_ICE"],
  transferOperation: ["NONE", "OIL_TRANSFER", "CHEMICAL_TRANSFER", "GAS_TRANSFER"],
  dpOffshoreService: ["NONE", "DP", "OFFSHORE", "DP_AND_OFFSHORE"],
  conversionStatus: ["NOT_CALCULATED", "NOT_APPLICABLE", "CALCULATED", "MANUAL_REVIEW_REQUIRED", "CALCULATION_ERROR"],
  calculationSource: ["DAYS_ON_BOARD", "DAYS_AT_SEA", "OTHER"],
  reviewStatus: ["NOT_REVIEWED", "ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT", "ADDITIONAL_INFORMATION_REQUIRED", "REJECTED"],
  examinerBasis: ["NONE", "DAYS_ON_BOARD", "DAYS_AT_SEA", "CONVERTED_DAYS", "MANUAL_DETERMINATION"],
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
    adjustmentRequired: false,
    adjustmentReasonCode: null,
    adjustmentReason: "",
    examinerComments: "",
    reviewedBy: null,
    reviewedAt: null,
    outstandingIssues: []
  };
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
      iceService: "NONE", passengerService: false, transferOperation: "NONE",
      fishingService: false, dpOffshoreService: "NONE", supportingDetails: ""
    },
    calculation: {
      sourceType: null, sourceDays: null, conversionStatus: "NOT_CALCULATED",
      conversionRate: null, convertedDays: null, calculationRuleId: null,
      calculationRuleVersion: null, legalReference: { document: null, section: null },
      explanationEn: "", explanationFr: "", warnings: [], errors: []
    },
    examinerReview: createExaminerReview(),
    metadata: { enteredBy: "CANDIDATE", createdAt: now, updatedAt: now, sourceRecordId: null, legacyFieldsConverted: false, legacyWarnings: [] }
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
      startedAt: null, completedAt: null, rulesVersion: null, applicationVersion: APPLICATION_VERSION
    },
    auditTrail: []
  };
}

export function createEmptySummary() {
  return {
    candidateClaim: { totalDaysOnBoard: 0, totalDaysAtSea: 0 },
    automatedCalculation: { totalConvertedDays: null, recordsCalculated: 0, recordsNotCalculated: 0, recordsRequiringManualReview: 0 },
    examinerDetermination: { recordsReviewed: 0, recordsAccepted: 0, recordsAcceptedWithAdjustment: 0, recordsRejected: 0, recordsRequiringInformation: 0, totalFinalAcceptedDays: 0 },
    specializedService: { polarDays: 0, acceptableIceDays: 0, oilTransferDays: 0, chemicalTransferDays: 0, gasTransferDays: 0, passengerServiceDays: 0, fishingServiceDays: 0, dynamicPositioningDays: 0, offshoreServiceDays: 0 },
    capacityService: { masterDays: 0, chiefMateDays: 0, mateDays: 0, supernumeraryMateDays: 0, chiefEngineerDays: 0, secondEngineerDays: 0, engineerOfficerDays: 0 },
    vesselThresholds: { gt500Days: 0, gt3000Days: 0 },
    voyageAreas: { nearCoastalDays: 0, unlimitedDays: 0 },
    warnings: [], errors: []
  };
}
