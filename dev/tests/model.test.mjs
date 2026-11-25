/**
 * Unit tests — v0.5.0 data model, migration, examiner review, summary.
 * Run: node --test dev/tests/
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createVoyage, ENUMS, SCHEMA_VERSION } from "../js/dataModel.js";
import { inclusiveDays, updateCandidateDays, updateExaminerBasis } from "../js/calculationEngine.js";
import { migrateRecordToV050 } from "../js/migrationEngine.js";
import { applyExaminerReview } from "../js/examinerReview.js";
import { validateExaminerReview } from "../js/validationEngine.js";
import { buildSummary } from "../js/summaryEngine.js";
import { TEXT } from "../js/examinerI18n.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(readFileSync(join(here, "fixtures", name), "utf8"));

function voyage(embark, disembark, atSea = null) {
  const v = createVoyage(1);
  v.dates.embarkationDate = embark;
  v.dates.disembarkationDate = disembark;
  v.dates.daysAtSeaEntered = atSea;
  return updateCandidateDays(v);
}

test("inclusive day count", () => {
  assert.equal(inclusiveDays("2025-01-01", "2025-01-31"), 31);
  assert.equal(inclusiveDays("2025-01-01", "2025-01-01"), 1);
  assert.equal(inclusiveDays("2025-03-30", "2025-03-31"), 2); // DST change safe
  assert.equal(inclusiveDays("2025-02-01", "2025-01-01"), null);
  assert.equal(inclusiveDays("", "2025-01-01"), null);
});

test("days at sea: blank uses days on board; different flagged", () => {
  const a = voyage("2025-01-01", "2025-01-10");
  assert.equal(a.dates.daysAtSeaEffective, 10);
  assert.equal(a.dates.daysAtSeaDifferent, false);
  const b = voyage("2025-01-01", "2025-01-10", "6");
  assert.equal(b.dates.daysAtSeaEffective, 6);
  assert.equal(b.dates.daysAtSeaDifferent, true);
});

test("converted days default to null, never zero", () => {
  const v = createVoyage(1);
  assert.equal(v.calculation.convertedDays, null);
  assert.equal(v.calculation.conversionStatus, "NOT_CALCULATED");
  const r = migrateRecordToV050(fixture("legacy-v0.4.0.json"));
  r.voyages.forEach((x) => assert.equal(x.calculation.convertedDays, null));
  const s = buildSummary(r.voyages);
  assert.equal(s.automatedCalculation.totalConvertedDays, null);
});

test("examiner basis options are exactly the four required", () => {
  assert.deepEqual(ENUMS.examinerBasisSelectable, ["DAYS_ON_BOARD", "DAYS_AT_SEA", "CONVERTED_DAYS", "MANUAL_DETERMINATION"]);
});

test("adjustment reason required when final differs from basis", () => {
  const v = voyage("2025-01-01", "2025-01-10", 8);
  let res = applyExaminerReview(v, { reviewStatus: "ACCEPTED", examinerBasis: "DAYS_ON_BOARD", finalAcceptedDays: 10 });
  assert.equal(res.valid, true, res.errors.join());
  assert.equal(v.examinerReview.adjustmentRequired, false);

  res = applyExaminerReview(v, { examinerBasis: "DAYS_ON_BOARD", finalAcceptedDays: 9, adjustmentReason: "" });
  assert.ok(res.errors.includes("ADJUSTMENT_REASON_REQUIRED"));
  assert.ok(res.warnings.includes("CONSIDER_ACCEPTED_WITH_ADJUSTMENT"));

  res = applyExaminerReview(v, { reviewStatus: "ACCEPTED_WITH_ADJUSTMENT", adjustmentReason: "One day in port awaiting crew change." });
  assert.equal(res.valid, true, res.errors.join());

  res = applyExaminerReview(v, { examinerBasis: "DAYS_AT_SEA", finalAcceptedDays: 8, adjustmentReason: "" , reviewStatus: "ACCEPTED"});
  assert.equal(res.valid, true, res.errors.join());
  assert.equal(v.examinerReview.basisDays, 8);
});

test("manual determination always requires a reason", () => {
  const v = voyage("2025-01-01", "2025-01-10");
  const res = applyExaminerReview(v, { reviewStatus: "ACCEPTED", examinerBasis: "MANUAL_DETERMINATION", finalAcceptedDays: 10, adjustmentReason: "" });
  assert.ok(res.errors.includes("ADJUSTMENT_REASON_REQUIRED"));
});

test("converted-days basis is blocked while not calculated", () => {
  const v = voyage("2025-01-01", "2025-01-10");
  const res = applyExaminerReview(v, { reviewStatus: "ACCEPTED", examinerBasis: "CONVERTED_DAYS", finalAcceptedDays: 10 });
  assert.ok(res.errors.includes("CONVERTED_DAYS_NOT_CALCULATED"));
  assert.equal(v.examinerReview.basisDays, null);
});

test("accepted line needs a basis and final days; rejected must be zero", () => {
  const v = voyage("2025-01-01", "2025-01-10");
  let res = applyExaminerReview(v, { reviewStatus: "ACCEPTED" });
  assert.ok(res.errors.includes("EXAMINER_BASIS_REQUIRED"));
  assert.ok(res.errors.includes("FINAL_ACCEPTED_DAYS_REQUIRED"));
  res = applyExaminerReview(v, { reviewStatus: "REJECTED", examinerBasis: "DAYS_ON_BOARD", finalAcceptedDays: 5, adjustmentReason: "x" });
  assert.ok(res.errors.includes("REJECTED_LINE_MUST_ACCEPT_ZERO"));
});

test("migration of production 0.4.0 record", () => {
  const r = migrateRecordToV050(fixture("legacy-v0.4.0.json"));
  assert.equal(r.schemaVersion, SCHEMA_VERSION);
  assert.equal(r.candidate.surname, "Tremblay");
  assert.equal(r.application.certificateAppliedFor.code, "MASTER_500_NC");
  assert.equal(r.examinerAssessment.generalComments, "Candidate record received by e-mail.");
  assert.equal(r.migration.fromSchemaVersion, "0.4.0");
  const [a, b, c] = r.voyages;
  assert.equal(a.dates.daysOnBoard, 31);
  assert.equal(a.dates.daysAtSeaEntered, null, "equal days at sea treated as blank");
  assert.equal(b.dates.daysAtSeaEntered, 25);
  assert.equal(b.dates.daysAtSeaDifferent, true);
  assert.equal(b.specializedService.iceService, "POLAR");
  assert.equal(b.specializedService.transferOperation, "OIL_TRANSFER");
  assert.equal(c.specializedService.dpOffshoreService, "DP_AND_OFFSHORE");
  assert.equal(a.specializedService.passengerService, true);
  assert.equal(a.vessel.identifierType, "OFFICIAL");
  assert.equal(b.vessel.identifierType, "IMO");
});

test("migration of pre-0.4 boolean fields and legacy examiner flags", () => {
  const r = migrateRecordToV050(fixture("legacy-pre-0.4.json"));
  const [a, b] = r.voyages;
  assert.equal(a.specializedService.iceService, "POLAR_AND_ACCEPTABLE_ICE");
  assert.equal(a.specializedService.dpOffshoreService, "DP_AND_OFFSHORE");
  assert.ok(a.metadata.legacyWarnings.includes("TRANSFER_OPERATION_TYPE_REQUIRED"));
  assert.equal(a.examinerReview.capacityVerified, true, "positionVerified -> capacityVerified");
  assert.equal(a.examinerReview.specializedServiceVerified, true, "seaServiceVerified -> specializedServiceVerified");
  assert.deepEqual(a.metadata.legacyFields, { positionVerified: true, seaServiceVerified: true, tanker: true, polar: true, ice: true, dp: true, offshore: true });
  assert.equal(a.dates.daysOnBoard, 10);
  assert.equal(b.dates.daysOnBoard, 45, "legacy day count retained when no dates");
  assert.equal(b.specializedService.iceService, "ACCEPTABLE_ICE");
  assert.equal(b.specializedService.dpOffshoreService, "OFFSHORE");
  assert.equal(b.examinerReview.capacityVerified, false);
  assert.deepEqual(r.migration.legacyRecordFields, { positionVerified: true, seaServiceVerified: false, examinerComments: "Legacy assessment notes." });
});

test("new field names take precedence over legacy names", () => {
  const r = migrateRecordToV050({ voyages: [{ positionVerified: true, capacityVerified: false, seaServiceVerified: false, specializedServiceVerified: true }] });
  assert.equal(r.voyages[0].examinerReview.capacityVerified, false);
  assert.equal(r.voyages[0].examinerReview.specializedServiceVerified, true);
});

test("0.5.0 records are normalised, not replaced", () => {
  const r = migrateRecordToV050(fixture("record-v0.5.0-partial.json"));
  assert.equal(r.recordId, "SSR-test-0001");
  const v = r.voyages[0];
  assert.equal(v.dates.daysOnBoard, 10);
  assert.equal(v.dates.daysAtSeaEffective, 8);
  assert.equal(v.examinerReview.examinerComments, "");
  assert.equal(v.examinerReview.basisDays, 8);
  assert.equal(v.calculation.convertedDays, null);
  assert.ok(Array.isArray(r.auditTrail));
});

test("summary distinguishes the four totals", () => {
  const r = migrateRecordToV050(fixture("legacy-v0.4.0.json"));
  const [a, b, c] = r.voyages;
  applyExaminerReview(a, { reviewStatus: "ACCEPTED", examinerBasis: "DAYS_ON_BOARD", finalAcceptedDays: 31 });
  applyExaminerReview(b, { reviewStatus: "ACCEPTED_WITH_ADJUSTMENT", examinerBasis: "DAYS_AT_SEA", finalAcceptedDays: 20, adjustmentReason: "Dry-dock period excluded." });
  applyExaminerReview(c, { reviewStatus: "REJECTED", examinerBasis: "DAYS_ON_BOARD", finalAcceptedDays: 0, adjustmentReason: "No discharge evidence." });
  const s = buildSummary(r.voyages);
  assert.equal(s.candidateClaim.totalDaysOnBoard, 101);
  assert.equal(s.candidateClaim.totalDaysAtSea, 86);
  assert.equal(s.automatedCalculation.totalConvertedDays, null);
  assert.equal(s.examinerDetermination.totalFinalAcceptedDays, 51);
  assert.equal(s.examinerDetermination.recordsReviewed, 3);
  assert.equal(s.examinerDetermination.recordsRejected, 1);
});

test("every English label has a French translation", () => {
  const missing = Object.keys(TEXT.en).filter((k) => !(k in TEXT.fr));
  assert.deepEqual(missing, []);
  assert.equal(TEXT.en.capacityVerified, "Capacity verified");
  assert.equal(TEXT.fr.capacityVerified, "Fonction vérifiée");
  assert.equal(TEXT.en.specializedServiceVerified, "Specialized service verified");
  assert.equal(TEXT.fr.specializedServiceVerified, "Service spécialisé vérifié");
  assert.equal(TEXT.en.notCalculated, "Not calculated");
  assert.equal(TEXT.fr.notCalculated, "Non calculé");
});

test("updateExaminerBasis compares numbers, not strings", () => {
  const v = voyage("2025-01-01", "2025-01-10");
  v.examinerReview.examinerBasis = "DAYS_ON_BOARD";
  v.examinerReview.finalAcceptedDays = "10";
  updateExaminerBasis(v);
  assert.equal(v.examinerReview.adjustmentRequired, false);
  assert.equal(validateExaminerReview(v).errors.includes("ADJUSTMENT_REASON_REQUIRED"), false);
});
