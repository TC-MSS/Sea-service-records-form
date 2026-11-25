/**
 * Rule-by-rule tests for the TP 2293 / MPR conversion engine.
 * Each test names the provision it verifies.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createVoyage } from "../js/dataModel.js";
import { recalculateVoyages } from "../js/calculationEngine.js";
import { serviceDaysOnBoard, findOverlaps, totals, JUNIOR_OFFICER_MAX_DAYS } from "../js/tp2293Engine.js";

function line({ s, e, atSea = null, watch = 8, cap = "MATE", type = "CARGO", dpo = "NONE" }) {
  const v = createVoyage(1);
  Object.assign(v.dates, { embarkationDate: s, disembarkationDate: e, daysAtSeaEntered: atSea });
  Object.assign(v.service, { watchHours: watch, capacityCode: cap });
  v.vessel.vesselTypeCode = type;
  v.specializedService.dpOffshoreService = dpo;
  return v;
}
const calc = (opts) => recalculateVoyages([line(opts)])[0].calculation;

test("R1 TP 2293 3.3(1),(4) Table 1 (A): discharge − engagement, minimum 1", () => {
  assert.equal(serviceDaysOnBoard("2025-01-01", "2025-01-31"), 30);
  assert.equal(serviceDaysOnBoard("2025-01-01", "2025-01-02"), 1);
  assert.equal(serviceDaysOnBoard("2025-01-01", "2025-01-01"), 1);
  assert.equal(serviceDaysOnBoard("2024-02-01", "2024-03-01"), 29, "leap year");
  assert.equal(serviceDaysOnBoard("2025-12-15", "2026-01-15"), 31, "across year end (Table 1: +365)");
  assert.equal(serviceDaysOnBoard("2025-03-01", "2025-04-01"), 31, "across DST change");
  assert.equal(serviceDaysOnBoard("2025-02-01", "2025-01-01"), null);
  assert.equal(serviceDaysOnBoard("2025-02-30", "2025-03-01"), null, "invalid date");
});

test("R2 MPR 115(1): 8-hour watch, 1 day = 1 day", () => {
  const c = calc({ s: "2025-01-01", e: "2025-03-02" }); // 60
  assert.equal(c.convertedDays, 60);
  assert.equal(c.calculationRuleId, "MPR-115(1)");
  assert.equal(c.sourceType, "DAYS_ON_BOARD");
});

test("R3 MPR 115(2) / TP 2293 3.5(1): 12-hour watch = 1.5 days, rounded down", () => {
  const c = calc({ s: "2025-01-01", e: "2025-01-30", watch: 12 }); // 29 × 1.5 = 43.5
  assert.equal(c.convertedDaysExact, 43.5);
  assert.equal(c.convertedDays, 43);
  assert.ok(c.warnings.includes("ATTESTATION_REQUIRED_OVER_8H"));
});

test("R3 proration for other watch lengths, capped at 12 h", () => {
  assert.equal(calc({ s: "2025-01-01", e: "2025-01-09", watch: 10 }).convertedDays, 10); // 8 × 1.25
  const c = calc({ s: "2025-01-01", e: "2025-01-09", watch: 16 });
  assert.equal(c.convertedDays, 12); // 8 × 1.5
  assert.ok(c.warnings.includes("WATCH_HOURS_CAPPED_12"));
  assert.ok(calc({ s: "2025-01-01", e: "2025-01-09", watch: null }).warnings.includes("WATCH_HOURS_ASSUMED_8"));
});

test("R4 MPR 115(2): cadet — any service in a day = 1 day, no 12-h proration or attestation", () => {
  const c = calc({ s: "2025-01-01", e: "2025-01-31", watch: 12, cap: "DECK_CADET" });
  assert.equal(c.convertedDays, 30);
  assert.ok(!c.warnings.includes("ATTESTATION_REQUIRED_OVER_8H"));
});

test("R5 TP 2293 3.7(1)(a): 8-h watch on days under way = min(1.5 × B, A)", () => {
  assert.equal(calc({ s: "2025-01-01", e: "2025-01-31", atSea: 10 }).convertedDays, 15); // 15 < 30
  const c = calc({ s: "2025-01-01", e: "2025-01-31", atSea: 25 });                         // 37.5 > 30
  assert.equal(c.convertedDays, 30);
  assert.equal(c.calculationRuleId, "TP2293-3.7(1)(a)");
  assert.ok(c.warnings.includes("DAYS_UNDERWAY_METHOD_CONFIRM"));
});

test("R5 TP 2293 3.7(1)(b): 12-h watch = min(2.25 × B, 1.5 × A)", () => {
  assert.equal(calc({ s: "2025-01-01", e: "2025-01-31", atSea: 10, watch: 12 }).convertedDays, 22); // 22.5 < 45
  const c = calc({ s: "2025-01-01", e: "2025-01-31", atSea: 25, watch: 12 });                         // 56.25 > 45
  assert.equal(c.convertedDays, 45);
  assert.equal(c.calculationRuleId, "TP2293-3.7(1)(b)");
});

test("R5 TP 2293 Table 1 worked example (A = 100, B = 60)", () => {
  // engaged day 10, discharged day 110 → A = 100
  assert.equal(calc({ s: "2025-01-10", e: "2025-04-20", atSea: 60 }).convertedDays, 90);           // 8 h: min(90, 100)
  assert.equal(calc({ s: "2025-01-10", e: "2025-04-20", atSea: 60, watch: 12 }).convertedDays, 135); // 12 h: min(150, 135)
});

test("R5 days under way with a watch other than 8 or 12 h → manual review", () => {
  const c = calc({ s: "2025-01-01", e: "2025-01-31", atSea: 10, watch: 10 });
  assert.equal(c.conversionStatus, "MANUAL_REVIEW_REQUIRED");
  assert.equal(c.convertedDays, null);
});

test("days at sea greater than days on board → calculation error, null", () => {
  const c = calc({ s: "2025-01-01", e: "2025-01-11", atSea: 15 });
  assert.equal(c.conversionStatus, "CALCULATION_ERROR");
  assert.equal(c.convertedDays, null);
});

test("R6 MPR 117: junior officer credited at 2/3 and capped at 9 months overall", () => {
  const c = calc({ s: "2025-01-01", e: "2025-01-31", cap: "SUPERNUMERARY_MATE" }); // 30 × 2/3
  assert.equal(c.convertedDays, 20);
  const vs = [
    line({ s: "2024-01-01", e: "2024-12-31", cap: "SUPERNUMERARY_MATE" }), // 365 → 243
    line({ s: "2025-01-01", e: "2025-03-02", cap: "SUPERNUMERARY_MATE" }), // 60 → 40
    line({ s: "2025-04-01", e: "2025-05-01", cap: "MATE" })                // 30
  ];
  recalculateVoyages(vs);
  const tt = totals(vs);
  assert.equal(tt.juniorOfficerDays, 283);
  assert.equal(tt.juniorOfficerExcessDays, 283 - JUNIOR_OFFICER_MAX_DAYS);
  assert.equal(tt.totalConvertedDays, JUNIOR_OFFICER_MAX_DAYS + 30);
});

test("R7 MPR 115(3): months = days ÷ 30", () => {
  const vs = recalculateVoyages([line({ s: "2025-01-01", e: "2025-04-01" })]); // 90
  assert.equal(totals(vs).totalConvertedMonths, 3);
});

test("R8 TP 2293 3.3(2): overlapping dates are flagged; sharing a change-over day is not", () => {
  const vs = [
    line({ s: "2025-01-01", e: "2025-01-31" }),
    line({ s: "2025-01-31", e: "2025-02-28" }),  // same-day change-over
    line({ s: "2025-02-20", e: "2025-03-10" })   // 8 days overlap with line 2
  ];
  recalculateVoyages(vs);
  assert.deepEqual(findOverlaps(vs), [{ a: 1, b: 2, days: 8 }]);
  assert.ok(vs[2].calculation.warnings.includes("OVERLAPPING_SERVICE"));
  assert.deepEqual(vs[1].calculation.overlaps, [{ line: 3, days: 8 }]);
  assert.ok(!vs[0].calculation.warnings.includes("OVERLAPPING_SERVICE"));
  assert.equal(totals(vs).overlapDays, 8);
});

test("TP 2293 3.20 / 3.21: MOU not on DP → manual review; MOU on DP → normal rate", () => {
  assert.equal(calc({ s: "2025-01-01", e: "2025-01-31", type: "MOU" }).conversionStatus, "MANUAL_REVIEW_REQUIRED");
  const c = calc({ s: "2025-01-01", e: "2025-01-31", type: "MOU", dpo: "DP" });
  assert.equal(c.convertedDays, 30);
  assert.ok(c.warnings.includes("MOU_DP_FULL_RATE"));
});

test("TP 2293 3.25: barge — deck service manual review, engine service calculated", () => {
  assert.equal(calc({ s: "2025-01-01", e: "2025-01-31", type: "BARGE", cap: "MATE" }).conversionStatus, "MANUAL_REVIEW_REQUIRED");
  assert.equal(calc({ s: "2025-01-01", e: "2025-01-31", type: "BARGE", cap: "ENGINEER_OFFICER" }).convertedDays, 30);
  assert.ok(calc({ s: "2025-01-01", e: "2025-01-31", type: "DREDGER" }).warnings.includes("DREDGER_SELF_PROPELLED_CHECK"));
  assert.ok(calc({ s: "2025-01-01", e: "2025-01-31", type: "AIR_CUSHION" }).warnings.includes("AIR_CUSHION_MASS_CHECK"));
});

test("explanations are produced in both languages with references", () => {
  const c = calc({ s: "2025-01-01", e: "2025-01-31", atSea: 10, watch: 12 });
  assert.match(c.explanationEn, /2\.25/);
  assert.match(c.explanationEn, /TP 2293 3\.7/);
  assert.match(c.explanationFr, /2,25/);
  assert.match(c.explanationFr, /jours crédités/);
});

test("missing dates → not calculated, null", () => {
  const c = calc({ s: null, e: null });
  assert.equal(c.conversionStatus, "NOT_CALCULATED");
  assert.equal(c.convertedDays, null);
});
