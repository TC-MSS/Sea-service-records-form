/**
 * Unit tests — v0.5.0 data model, migration, examiner review, summary (updated for v0.8.0).
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
import { applyExaminerReview, EXAMINER_INPUT_FIELDS } from "../js/examinerReview.js";
import { validateExaminerReview, validateVoyage } from "../js/validationEngine.js";
import { buildSummary } from "../js/summaryEngine.js";
import { TEXT } from "../js/examinerI18n.js";
import { candidatePrintHtml, examinerPrintHtml } from "../js/printView.js";
import { lineSpecialServiceDays } from "../js/summaryEngine.js";
import { CAPACITIES, labelFor } from "../js/referenceData.js";

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

test("v0.8.0 item 4: examiner basis removed — reference is always the converted days", () => {
  const v = voyage("2025-01-01", "2025-01-11", 8); // A = 10, B = 8 → 8-h: min(12, 10) = 10
  v.examinerReview.examinerBasis = "DAYS_AT_SEA"; // value from an older record: ignored
  applyExaminerReview(v, { reviewStatus: "ACCEPTED_WITH_ADJUSTMENT", finalAcceptedDays: 8 });
  assert.equal(v.examinerReview.referenceDays, 10);
  assert.equal(v.examinerReview.referenceSource, "CONVERTED_DAYS");
  assert.equal(v.examinerReview.basisDays, null);
  assert.equal(v.examinerReview.adjustmentRequired, true);
  assert.ok(!("examinerBasis" in Object.fromEntries(EXAMINER_INPUT_FIELDS.map((f) => [f, 1]))));
});

test("v0.8.0 item 3: Accepted counts converted days; final days only with adjustment / information required", () => {
  const v = voyage("2025-01-01", "2025-01-11"); // converted = 10
  let res = applyExaminerReview(v, { reviewStatus: "ACCEPTED", finalAcceptedDays: 7 });
  assert.equal(v.examinerReview.finalAcceptedDays, null, "final days cleared for Accepted");
  assert.equal(v.examinerReview.effectiveAcceptedDays, 10);
  assert.equal(res.valid, true);

  res = applyExaminerReview(v, { reviewStatus: "ACCEPTED_WITH_ADJUSTMENT", finalAcceptedDays: null, adjustmentReason: "" });
  assert.ok(res.warnings.includes("FINAL_ACCEPTED_DAYS_REQUIRED"));
  assert.ok(res.warnings.includes("ADJUSTMENT_REASON_REQUIRED"), "adjustment always needs a reason");
  assert.equal(v.examinerReview.effectiveAcceptedDays, 0);

  res = applyExaminerReview(v, { finalAcceptedDays: 12 });
  assert.equal(v.examinerReview.effectiveAcceptedDays, 12, "final days override converted days");
  assert.ok(res.warnings.includes("FINAL_EXCEEDS_BASIS"));
  res = applyExaminerReview(v, { adjustmentReason: "Two extra days per testimonial." });
  assert.ok(!res.warnings.includes("ADJUSTMENT_REASON_REQUIRED"));
  assert.equal(res.valid, true);

  res = applyExaminerReview(v, { reviewStatus: "ADDITIONAL_INFORMATION_REQUIRED", finalAcceptedDays: null, adjustmentReason: "" });
  assert.equal(v.examinerReview.effectiveAcceptedDays, 0, "information required without final days counts 0");
  assert.ok(!res.warnings.includes("ADJUSTMENT_REASON_REQUIRED"));
  res = applyExaminerReview(v, { finalAcceptedDays: 9 });
  assert.equal(v.examinerReview.effectiveAcceptedDays, 9);
  assert.ok(res.warnings.includes("FINAL_DAYS_PENDING_INFORMATION"));
  assert.ok(res.warnings.includes("ADJUSTMENT_REASON_REQUIRED"), "9 differs from 10");
  res = applyExaminerReview(v, { finalAcceptedDays: 10 });
  assert.ok(!res.warnings.includes("ADJUSTMENT_REASON_REQUIRED"), "equal to converted days: no reason");

  applyExaminerReview(v, { reviewStatus: "REJECTED", finalAcceptedDays: 5 });
  assert.equal(v.examinerReview.finalAcceptedDays, null);
  assert.equal(v.examinerReview.effectiveAcceptedDays, 0);

  applyExaminerReview(v, { reviewStatus: "NOT_REVIEWED", finalAcceptedDays: 5 });
  assert.equal(v.examinerReview.reviewStatus, "NOT_REVIEWED", "no automatic status any more");
  assert.equal(v.examinerReview.effectiveAcceptedDays, 0);
});

test("v0.8.0: Accepted on a manual-review line counts 0 with a warning", () => {
  const v = voyage("2025-01-01", "2025-01-11");
  v.vessel.vesselTypeCode = "MOU";
  recalculateVoyages([v]);
  let res = applyExaminerReview(v, { reviewStatus: "ACCEPTED" });
  assert.ok(res.warnings.includes("ACCEPTED_WITHOUT_CONVERTED_DAYS"));
  assert.equal(v.examinerReview.effectiveAcceptedDays, 0);
  res = applyExaminerReview(v, { reviewStatus: "ACCEPTED_WITH_ADJUSTMENT", finalAcceptedDays: 7, adjustmentReason: "MOU Table III" });
  assert.equal(v.examinerReview.effectiveAcceptedDays, 7);
  assert.equal(res.valid, true);
});

test("v0.8.0: invalid final days are errors and count 0", () => {
  const v = voyage("2025-01-01", "2025-01-11");
  let res = applyExaminerReview(v, { reviewStatus: "ACCEPTED_WITH_ADJUSTMENT", finalAcceptedDays: -2 });
  assert.ok(res.errors.includes("NEGATIVE_FINAL_ACCEPTED_DAYS"));
  assert.equal(v.examinerReview.effectiveAcceptedDays, 0);
  res = applyExaminerReview(v, { finalAcceptedDays: 2.5 });
  assert.ok(res.errors.includes("FINAL_ACCEPTED_DAYS_NOT_WHOLE"));
});

test("v0.8.0: reviews saved by v0.6/v0.7 keep the examiner's figure", () => {
  const mk = (status, final, basis = "NONE") => ({
    schemaVersion: "0.5.0", voyages: [{
      service: { capacityCode: "MATE", watchHours: 8 }, dates: { embarkationDate: "2025-01-01", disembarkationDate: "2025-01-11" },
      examinerReview: { reviewStatus: status, examinerBasis: basis, finalAcceptedDays: final }
    }]
  });
  const one = (rec) => migrateRecordToV050(rec).voyages[0];
  let v = one(mk("ACCEPTED", 10));               // equal to converted
  assert.equal(v.examinerReview.reviewStatus, "ACCEPTED");
  assert.equal(v.examinerReview.effectiveAcceptedDays, 10);
  v = one(mk("ACCEPTED", 8, "DAYS_AT_SEA"));     // differed from converted
  assert.equal(v.examinerReview.reviewStatus, "ACCEPTED_WITH_ADJUSTMENT");
  assert.equal(v.examinerReview.finalAcceptedDays, 8);
  assert.equal(v.examinerReview.effectiveAcceptedDays, 8);
  assert.ok(v.metadata.legacyWarnings.includes("REVIEW_STATUS_CONVERTED_V080"));
  v = one(mk("NOT_REVIEWED", 6));
  assert.equal(v.examinerReview.reviewStatus, "ACCEPTED_WITH_ADJUSTMENT");
  assert.equal(v.examinerReview.effectiveAcceptedDays, 6);
  v = one(mk("REJECTED", 4));
  assert.equal(v.examinerReview.finalAcceptedDays, null);
  assert.equal(v.examinerReview.effectiveAcceptedDays, 0);
  v = one(mk("ADDITIONAL_INFORMATION_REQUIRED", 5));
  assert.equal(v.examinerReview.finalAcceptedDays, 5);
  assert.deepEqual(v.metadata.legacyWarnings, []);
});

test("v0.8.0 item 6: approved days per special service, overlapping dates counted once", () => {
  const mk = (embark, disembark, spec) => {
    const v = createVoyage(1);
    v.service.capacityCode = "MATE"; v.service.watchHours = 8;
    v.dates.embarkationDate = embark; v.dates.disembarkationDate = disembark;
    Object.assign(v.specializedService, spec);
    return v;
  };
  const a = mk("2025-01-01", "2025-01-31", { transferOperation: "OIL_TRANSFER", passengerService: true }); // 30 days
  const b = mk("2025-01-21", "2025-02-10", { transferOperation: "OIL_TRANSFER" });                         // 20 days, 10 overlap
  const c = mk("2025-03-01", "2025-03-31", { iceConditions: { POLAR: { selected: true, days: 40 }, ACCEPTABLE_ICE: { selected: true, days: 12 } } });
  const d = mk("2025-04-01", "2025-04-11", { transferOperation: "GAS_TRANSFER" });
  recalculateVoyages([a, b, c, d]);
  for (const v of [a, b, c]) applyExaminerReview(v, { reviewStatus: "ACCEPTED" });
  applyExaminerReview(d, { reviewStatus: "REJECTED" });
  const s = buildSummary([a, b, c, d]);
  assert.equal(s.examinerDetermination.totalFinalAcceptedDays, 80);
  assert.deepEqual(s.examinerDetermination.specialServiceApprovedDays, {
    POLAR: 30,            // 40 entered, limited to the line's 30 approved days
    ACCEPTABLE_ICE: 12,
    PASSENGER: 30,
    OIL_TRANSFER: 40,     // 30 + 20 − 10 overlapping days
    GAS_TRANSFER: 0       // selected, but the line was rejected
  });
  assert.equal(lineSpecialServiceDays(a, "FISHING"), null);
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
  assert.equal(v.calculation.convertedDays, 9);
  assert.equal(v.examinerReview.reviewStatus, "ACCEPTED_WITH_ADJUSTMENT", "v0.7 Accepted with final ≠ converted kept as an adjustment");
  assert.equal(v.examinerReview.effectiveAcceptedDays, 8);
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
  v.examinerReview.reviewStatus = "ADDITIONAL_INFORMATION_REQUIRED";
  v.examinerReview.finalAcceptedDays = "10";
  updateExaminerBasis(v);
  assert.equal(v.examinerReview.finalAcceptedDays, 10);
  assert.equal(v.examinerReview.adjustmentRequired, false);
  assert.equal(validateExaminerReview(v).warnings.includes("ADJUSTMENT_REASON_REQUIRED"), false);
});

test("PDF/print copies: unvetted label (candidate); v0.8.0 examiner summary with certificate", () => {
  const r = migrateRecordToV050(fixture("legacy-v0.4.0.json"));
  r.voyages[1].specializedService.iceConditions.POLAR.days = 12;
  recalculateVoyages(r.voyages);
  applyExaminerReview(r.voyages[0], { reviewStatus: "ACCEPTED_WITH_ADJUSTMENT", finalAcceptedDays: 25, adjustmentReason: "Leave" });
  applyExaminerReview(r.voyages[1], { reviewStatus: "ACCEPTED" });
  const s = buildSummary(r.voyages);
  const c = candidatePrintHtml(r, s, "en", "Statement of Sea Service for a Certificate");
  assert.match(c, /Unvetted sea service — subject to examiner review/);
  assert.match(c, /Service en mer non vérifié/);
  assert.match(c, /Polar waters: 12 d/);
  assert.match(c, /Mate in Charge of a Watch/);
  const f = candidatePrintHtml(r, s, "fr", "État");
  assert.match(f, /Eaux polaires: 12 j/);
  assert.match(f, /Officier de pont en charge du quart à la passerelle/);
  const e = examinerPrintHtml(r, s, "en");
  assert.match(e, /<strong>Total final accepted days: 81 \(2\.7 months\)<\/strong>/);
  assert.match(e, /Certificate applied for: <strong>Master 500 Gross Tonnage, Near Coastal<\/strong>/);
  assert.match(e, /Difference from total converted days<\/th><td>-48/);
  assert.match(e, /Polar waters<\/th><td>12/);
  assert.doesNotMatch(e, /Examiner basis|Lines reviewed|Lines with/);
});

test("v0.8.0 item 1: capacity MATE is 'Mate in Charge of a Watch' / 'Officier de pont en charge du quart à la passerelle'", () => {
  assert.equal(labelFor(CAPACITIES, "MATE", "en"), "Mate in Charge of a Watch");
  assert.equal(labelFor(CAPACITIES, "MATE", "fr"), "Officier de pont en charge du quart à la passerelle");
  assert.equal(labelFor(CAPACITIES, "SUPERNUMERARY_MATE", "en"), "Supernumerary Mate");
});
