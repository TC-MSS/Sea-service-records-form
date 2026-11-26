/**
 * Unit tests — v0.5.0 data model, migration, examiner review, summary (updated for v0.7.0).
 * Run: node --test dev/tests/model.test.mjs dev/tests/tp2293.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createVoyage, ENUMS, SCHEMA_VERSION } from "../js/dataModel.js";
import { inclusiveDays, updateCandidateDays, updateExaminerBasis, recalculateVoyages } from "../js/calculationEngine.js";
import { migrateRecordToV050 } from "../js/migrationEngine.js";
import { applyExaminerReview } from "../js/examinerReview.js";
import { validateExaminerReview, validateVoyage } from "../js/validationEngine.js";
import { buildSummary } from "../js/summaryEngine.js";
import { TEXT } from "../js/examinerI18n.js";
import { candidatePrintHtml, examinerPrintHtml } from "../js/printView.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(readFileSync(join(here, "fixtures", name), "utf8"));

function voyage(embark, disembark, atSea = null, watch = 8) {
  const v = createVoyage(1);
  v.dates.embarkationDate = embark;
  v.dates.disembarkationDate = disembark;
  v.dates.daysAtSeaEntered = atSea;
  v.service.watchHours = watch;
  v.service.capacityCode = "MATE";
  recalculateVoyages([v]);
  return v;
}

test("inclusive calendar count is still available (reference only)", () => {
  assert.equal(inclusiveDays("2025-01-01", "2025-01-31"), 31);
  assert.equal(inclusiveDays("2025-02-01", "2025-01-01"), null);
});

test("days on board follow TP 2293 s. 3.3(4): engagement + discharge days = one day", () => {
  const v = voyage("2025-01-01", "2025-01-31");
  assert.equal(v.dates.daysOnBoard, 30);
  assert.equal(voyage("2025-01-01", "2025-01-01").dates.daysOnBoard, 1);
});

test("days at sea: blank uses days on board; different flagged", () => {
  const a = voyage("2025-01-01", "2025-01-11");
  assert.equal(a.dates.daysAtSeaEffective, 10);
  assert.equal(a.dates.daysAtSeaDifferent, false);
  const b = voyage("2025-01-01", "2025-01-11", "6");
  assert.equal(b.dates.daysAtSeaEffective, 6);
  assert.equal(b.dates.daysAtSeaDifferent, true);
});

test("converted days: null when not calculable (never zero), calculated otherwise", () => {
  const v = createVoyage(1);
  updateCandidateDays(v);
  recalculateVoyages([v]);
  assert.equal(v.calculation.convertedDays, null);
  assert.equal(v.calculation.conversionStatus, "NOT_CALCULATED");
  const r = migrateRecordToV050(fixture("legacy-v0.4.0.json"));
  assert.deepEqual(r.voyages.map((x) => x.calculation.convertedDays), [30, 56, 43]);
  assert.equal(buildSummary(r.voyages).automatedCalculation.totalConvertedDays, 129);
});

test("examiner basis options are exactly the four required", () => {
  assert.deepEqual(ENUMS.examinerBasisSelectable, ["DAYS_ON_BOARD", "DAYS_AT_SEA", "CONVERTED_DAYS", "MANUAL_DETERMINATION"]);
});

test("adjustment reason needed when final differs from the basis — a warning, never a block (v0.7.0)", () => {
  const v = voyage("2025-01-01", "2025-01-11", 8); // A = 10, B = 8
  let res = applyExaminerReview(v, { reviewStatus: "ACCEPTED", examinerBasis: "DAYS_ON_BOARD", finalAcceptedDays: 10 });
  assert.equal(res.valid, true, res.errors.join());
  assert.equal(v.examinerReview.adjustmentRequired, false);

  res = applyExaminerReview(v, { examinerBasis: "DAYS_ON_BOARD", finalAcceptedDays: 9, adjustmentReason: "" });
  assert.equal(res.valid, true, "missing reason does not block");
  assert.ok(res.warnings.includes("ADJUSTMENT_REASON_REQUIRED"));
  assert.ok(res.warnings.includes("CONSIDER_ACCEPTED_WITH_ADJUSTMENT"));
  assert.equal(v.examinerReview.effectiveAcceptedDays, 9);

  res = applyExaminerReview(v, { reviewStatus: "ACCEPTED_WITH_ADJUSTMENT", adjustmentReason: "One day in port awaiting crew change." });
  assert.ok(!res.warnings.includes("ADJUSTMENT_REASON_REQUIRED"));

  res = applyExaminerReview(v, { examinerBasis: "DAYS_AT_SEA", finalAcceptedDays: 8, adjustmentReason: "", reviewStatus: "ACCEPTED" });
  assert.equal(res.valid, true, res.errors.join());
  assert.equal(v.examinerReview.basisDays, 8);
  assert.ok(!res.warnings.includes("ADJUSTMENT_REASON_REQUIRED"));
});

test("converted-days basis uses the calculated value", () => {
  const v = voyage("2025-01-01", "2025-01-11", 8); // 8-h: min(1.5 × 8 = 12, 10) = 10
  const res = applyExaminerReview(v, { reviewStatus: "ACCEPTED", examinerBasis: "CONVERTED_DAYS", finalAcceptedDays: 10 });
  assert.equal(v.examinerReview.basisDays, 10);
  assert.equal(res.valid, true, res.errors.join());
});

test("manual-review line: no reference value, final days still counted, reason asked for", () => {
  const v = voyage("2025-01-01", "2025-01-11");
  v.vessel.vesselTypeCode = "MOU";
  recalculateVoyages([v]);
  const res = applyExaminerReview(v, { reviewStatus: "ACCEPTED", examinerBasis: "CONVERTED_DAYS", finalAcceptedDays: 7 });
  assert.equal(res.valid, true);
  assert.ok(res.warnings.includes("CONVERTED_DAYS_NOT_CALCULATED"));
  assert.ok(res.warnings.includes("ADJUSTMENT_REASON_REQUIRED"));
  assert.equal(v.examinerReview.basisDays, null);
  assert.equal(v.examinerReview.effectiveAcceptedDays, 7);
});

test("manual determination always asks for a reason", () => {
  const v = voyage("2025-01-01", "2025-01-11");
  const res = applyExaminerReview(v, { reviewStatus: "ACCEPTED", examinerBasis: "MANUAL_DETERMINATION", finalAcceptedDays: 10, adjustmentReason: "" });
  assert.ok(res.warnings.includes("ADJUSTMENT_REASON_REQUIRED"));
  assert.equal(res.valid, true);
});

test("v0.7.0: basis optional — accepted without basis or final days counts the converted days; rejected counts 0", () => {
  const v = voyage("2025-01-01", "2025-01-11"); // converted = 10
  let res = applyExaminerReview(v, { reviewStatus: "ACCEPTED" });
  assert.equal(res.valid, true);
  assert.ok(!res.errors.includes("EXAMINER_BASIS_REQUIRED"));
  assert.ok(res.warnings.includes("FINAL_DAYS_DEFAULTED_TO_REFERENCE"));
  assert.equal(v.examinerReview.referenceSource, "CONVERTED_DAYS");
  assert.equal(v.examinerReview.effectiveAcceptedDays, 10);
  res = applyExaminerReview(v, { reviewStatus: "REJECTED", finalAcceptedDays: 5, adjustmentReason: "x" });
  assert.ok(res.warnings.includes("REJECTED_LINE_COUNTS_ZERO"));
  assert.equal(v.examinerReview.effectiveAcceptedDays, 0);
});

test("v0.7.0: no basis — final days compared with converted days", () => {
  const v = voyage("2025-01-01", "2025-01-11"); // converted = 10
  applyExaminerReview(v, { reviewStatus: "ACCEPTED", finalAcceptedDays: 10 });
  assert.equal(v.examinerReview.adjustmentRequired, false);
  applyExaminerReview(v, { finalAcceptedDays: 12 });
  assert.equal(v.examinerReview.adjustmentRequired, true);
  assert.equal(v.examinerReview.effectiveAcceptedDays, 12, "final days override converted days");
});

test("v0.7.0 4(d): final days on a Not reviewed line set the status automatically", () => {
  const v = voyage("2025-01-01", "2025-01-11"); // converted = 10
  let res = applyExaminerReview(v, { reviewStatus: "NOT_REVIEWED", finalAcceptedDays: 10 });
  assert.equal(v.examinerReview.reviewStatus, "ACCEPTED");
  assert.equal(res.statusChanged, true);
  assert.ok(res.warnings.includes("STATUS_SET_AUTOMATICALLY"));
  // still automatic: follows the final days
  applyExaminerReview(v, { reviewStatus: "ACCEPTED", finalAcceptedDays: 8 });
  assert.equal(v.examinerReview.reviewStatus, "ACCEPTED_WITH_ADJUSTMENT");
  // cleared → back to Not reviewed
  applyExaminerReview(v, { reviewStatus: "ACCEPTED_WITH_ADJUSTMENT", finalAcceptedDays: null });
  assert.equal(v.examinerReview.reviewStatus, "NOT_REVIEWED");
  assert.equal(v.examinerReview.effectiveAcceptedDays, 0);
  // manual choice ends the automatic mode
  applyExaminerReview(v, { reviewStatus: "NOT_REVIEWED", finalAcceptedDays: 8 });
  applyExaminerReview(v, { reviewStatus: "ADDITIONAL_INFORMATION_REQUIRED", finalAcceptedDays: 8 });
  assert.equal(v.examinerReview.statusSetAutomatically, false);
  res = applyExaminerReview(v, { reviewStatus: "ADDITIONAL_INFORMATION_REQUIRED", finalAcceptedDays: 9 });
  assert.equal(v.examinerReview.reviewStatus, "ADDITIONAL_INFORMATION_REQUIRED");
  assert.ok(res.warnings.includes("FINAL_DAYS_PENDING_INFORMATION"));
  assert.equal(v.examinerReview.effectiveAcceptedDays, 9);
});

test("v0.7.0: invalid final days are errors and count 0", () => {
  const v = voyage("2025-01-01", "2025-01-11");
  let res = applyExaminerReview(v, { reviewStatus: "ACCEPTED", finalAcceptedDays: -2 });
  assert.ok(res.errors.includes("NEGATIVE_FINAL_ACCEPTED_DAYS"));
  assert.equal(v.examinerReview.effectiveAcceptedDays, 0);
  res = applyExaminerReview(v, { finalAcceptedDays: 2.5 });
  assert.ok(res.errors.includes("FINAL_ACCEPTED_DAYS_NOT_WHOLE"));
});

test("v0.7.0 column K: several ice conditions, each with days; legacy code kept in step", () => {
  const v = voyage("2025-01-01", "2025-01-31"); // A = 30
  v.specializedService.iceConditions.POLAR.days = "12";
  v.specializedService.iceConditions.ACCEPTABLE_ICE.selected = true;
  recalculateVoyages([v]);
  assert.equal(v.specializedService.iceConditions.POLAR.selected, true, "days select the condition");
  assert.equal(v.specializedService.iceConditions.POLAR.days, 12);
  assert.equal(v.specializedService.iceService, "POLAR_AND_ACCEPTABLE_ICE");
  let res = validateVoyage(v);
  assert.ok(res.warnings.includes("ICE_DAYS_NOT_STATED"));
  v.specializedService.iceConditions.ACCEPTABLE_ICE.days = 31;
  recalculateVoyages([v]);
  res = validateVoyage(v);
  assert.ok(res.errors.includes("ICE_DAYS_EXCEED_ONBOARD"));
  v.specializedService.iceConditions.ACCEPTABLE_ICE.days = 20;
  recalculateVoyages([v]);
  assert.deepEqual(validateVoyage(v).errors, []);
  const s = buildSummary([v]);
  assert.equal(s.specializedService.polarDays, 12);
  assert.equal(s.specializedService.acceptableIceDays, 20);
  assert.equal(v.calculation.convertedDays, 30, "ice days do not change the conversion");
});

test("v0.7.0 column K: older single ice code converts to conditions without days", () => {
  const r = migrateRecordToV050(fixture("legacy-pre-0.4.json"));
  const ice = r.voyages[0].specializedService.iceConditions;
  assert.deepEqual(ice, { POLAR: { selected: true, days: null }, ACCEPTABLE_ICE: { selected: true, days: null } });
  const p = migrateRecordToV050({ schemaVersion: "0.5.0", voyages: [{ specializedService: { iceService: "ACCEPTABLE_ICE" } }] });
  assert.equal(p.voyages[0].specializedService.iceConditions.ACCEPTABLE_ICE.selected, true);
  assert.equal(p.voyages[0].specializedService.iceService, "ACCEPTABLE_ICE");
});

test("migration of production 0.4.0 record", () => {
  const r = migrateRecordToV050(fixture("legacy-v0.4.0.json"));
  assert.equal(r.schemaVersion, SCHEMA_VERSION);
  assert.equal(r.candidate.surname, "Tremblay");
  assert.equal(r.application.certificateAppliedFor.code, "MASTER_500_NC");
  assert.equal(r.examinerAssessment.generalComments, "Candidate record received by e-mail.");
  assert.equal(r.migration.fromSchemaVersion, "0.4.0");
  const [a, b, c] = r.voyages;
  assert.equal(a.dates.daysOnBoard, 30);
  assert.equal(a.dates.daysAtSeaEntered, null, "legacy days at sea equal to legacy days on board = not different");
  assert.equal(b.dates.daysAtSeaEntered, 25);
  assert.equal(b.dates.daysAtSeaDifferent, true);
  assert.equal(b.specializedService.iceService, "POLAR");
  assert.equal(b.specializedService.transferOperation, "OIL_TRANSFER");
  assert.equal(c.specializedService.dpOffshoreService, "DP_AND_OFFSHORE");
  assert.equal(a.specializedService.passengerService, true);
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
  assert.equal(a.dates.daysOnBoard, 9);
  assert.equal(b.dates.daysOnBoard, 45, "legacy day count retained when no dates");
  assert.equal(b.calculation.convertedDays, 45);
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

test("0.5.0 records are normalised and recalculated, not replaced", () => {
  const r = migrateRecordToV050(fixture("record-v0.5.0-partial.json"));
  assert.equal(r.recordId, "SSR-test-0001");
  const v = r.voyages[0];
  assert.equal(v.dates.daysOnBoard, 9);
  assert.equal(v.dates.daysAtSeaEffective, 8);
  assert.equal(v.examinerReview.examinerComments, "");
  assert.equal(v.examinerReview.basisDays, 8);
  assert.equal(v.calculation.convertedDays, 9);
  assert.ok(Array.isArray(r.auditTrail));
});

test("summary distinguishes the four totals", () => {
  const r = migrateRecordToV050(fixture("legacy-v0.4.0.json"));
  const [a, b, c] = r.voyages;
  applyExaminerReview(a, { reviewStatus: "ACCEPTED", examinerBasis: "DAYS_ON_BOARD", finalAcceptedDays: 30 });
  applyExaminerReview(b, { reviewStatus: "ACCEPTED_WITH_ADJUSTMENT", examinerBasis: "DAYS_AT_SEA", finalAcceptedDays: 20, adjustmentReason: "Dry-dock period excluded." });
  applyExaminerReview(c, { reviewStatus: "REJECTED", examinerBasis: "DAYS_ON_BOARD", finalAcceptedDays: 0, adjustmentReason: "No discharge evidence." });
  const s = buildSummary(r.voyages);
  assert.equal(s.candidateClaim.totalDaysOnBoard, 98);
  assert.equal(s.candidateClaim.totalDaysAtSea, 84);
  assert.equal(s.automatedCalculation.totalConvertedDays, 129);
  assert.equal(s.automatedCalculation.totalConvertedMonths, 4.3);
  assert.equal(s.examinerDetermination.totalFinalAcceptedDays, 50);
  assert.equal(s.examinerDetermination.differenceFromConverted, -79);
  assert.equal(s.examinerDetermination.totalFinalAcceptedMonths, 1.66);
  assert.equal(s.examinerDetermination.recordsReviewed, 3);
  assert.equal(s.examinerDetermination.recordsRejected, 1);
});

test("every English label has a French translation; renamed name field", () => {
  const missing = Object.keys(TEXT.en).filter((k) => !(k in TEXT.fr));
  assert.deepEqual(missing, []);
  assert.equal(TEXT.en.givenNames, "Given Name");
  assert.equal(TEXT.fr.givenNames, "Prénom");
  assert.equal(TEXT.en.capacityVerified, "Capacity verified");
  assert.equal(TEXT.fr.capacityVerified, "Fonction vérifiée");
  assert.equal(TEXT.en.specializedServiceVerified, "Specialized service verified");
  assert.equal(TEXT.fr.specializedServiceVerified, "Service spécialisé vérifié");
  assert.equal(TEXT.en.notCalculated, "Not calculated");
  assert.equal(TEXT.fr.notCalculated, "Non calculé");
});

test("updateExaminerBasis compares numbers, not strings", () => {
  const v = voyage("2025-01-01", "2025-01-11");
  v.examinerReview.examinerBasis = "DAYS_ON_BOARD";
  v.examinerReview.finalAcceptedDays = "10";
  updateExaminerBasis(v);
  assert.equal(v.examinerReview.adjustmentRequired, false);
  assert.equal(validateExaminerReview(v).warnings.includes("ADJUSTMENT_REASON_REQUIRED"), false);
});

test("v0.7.0: PDF/print copies carry the unvetted label (candidate) and the examiner figures", () => {
  const r = migrateRecordToV050(fixture("legacy-v0.4.0.json"));
  r.voyages[1].specializedService.iceConditions.POLAR.days = 12;
  recalculateVoyages(r.voyages);
  applyExaminerReview(r.voyages[0], { finalAcceptedDays: 25, adjustmentReason: "Leave" });
  const s = buildSummary(r.voyages);
  const c = candidatePrintHtml(r, s, "en", "Statement of Sea Service for a Certificate");
  assert.match(c, /Unvetted sea service — subject to examiner review/);
  assert.match(c, /Service en mer non vérifié/);
  assert.match(c, /Polar waters: 12 d/);
  const f = candidatePrintHtml(r, s, "fr", "État");
  assert.match(f, /Eaux polaires : 12 j|Eaux polaires: 12 j/);
  const e = examinerPrintHtml(r, s, "en");
  assert.match(e, /Total final accepted days<\/th><td>25/);
  assert.match(e, /Difference from total converted days<\/th><td>-104/);
  assert.doesNotMatch(e, /Schema \/ record/);
});
