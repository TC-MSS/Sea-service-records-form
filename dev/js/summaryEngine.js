/**
 * Summary engine — v0.7.0.
 *
 * Distinguishes four totals:
 *  - total days on board    (candidate claim, column R)
 *  - total days at sea      (candidate claim, column S or R when S is blank)
 *  - total converted days   (TP 2293 / MPR credited days; null when no line could be calculated)
 *  - total final accepted   (examiner determination — v0.7.0: the examiner's final days override
 *                            every other figure; rejected lines count 0; accepted lines without
 *                            final days count their reference value)
 * plus the column K ice-condition days (v0.7.0).
 */
import { createEmptySummary } from "./dataModel.js";
import { totals as conversionTotals, RULES_VERSION } from "./tp2293Engine.js";
import { reasonMissing } from "./validationEngine.js";

const months = (days) => Math.floor((days / 30) * 100) / 100;

export function buildSummary(voyages = []) {
  const s = createEmptySummary();
  const e = s.examinerDetermination;
  for (const v of voyages) {
    s.candidateClaim.totalDaysOnBoard += Number(v.dates.daysOnBoard ?? 0);
    s.candidateClaim.totalDaysAtSea += Number(v.dates.daysAtSeaEffective ?? 0);

    const ice = v.specializedService?.iceConditions || {};
    if (ice.POLAR?.selected) s.specializedService.polarDays += Number(ice.POLAR.days ?? 0);
    if (ice.ACCEPTABLE_ICE?.selected) s.specializedService.acceptableIceDays += Number(ice.ACCEPTABLE_ICE.days ?? 0);

    const r = v.examinerReview;
    if (r.reviewStatus === "NOT_REVIEWED") e.recordsNotReviewed += 1; else e.recordsReviewed += 1;
    if (r.reviewStatus === "ACCEPTED") e.recordsAccepted += 1;
    if (r.reviewStatus === "ACCEPTED_WITH_ADJUSTMENT") e.recordsAcceptedWithAdjustment += 1;
    if (r.reviewStatus === "REJECTED") e.recordsRejected += 1;
    if (r.reviewStatus === "ADDITIONAL_INFORMATION_REQUIRED") e.recordsRequiringInformation += 1;
    if (r.finalAcceptedDays !== null && r.reviewStatus !== "REJECTED") e.linesWithFinalDays += 1;
    if (reasonMissing(v)) e.linesMissingAdjustmentReason += 1;
    e.totalFinalAcceptedDays += Number(r.effectiveAcceptedDays ?? 0);
  }
  e.totalFinalAcceptedMonths = months(e.totalFinalAcceptedDays);
  s.automatedCalculation = { ...s.automatedCalculation, ...conversionTotals(voyages), rulesVersion: RULES_VERSION };
  const converted = s.automatedCalculation.totalConvertedDays;
  e.differenceFromConverted = converted === null ? null : e.totalFinalAcceptedDays - converted;
  if (s.automatedCalculation.juniorOfficerExcessDays > 0) s.warnings.push("JUNIOR_OFFICER_CAP_APPLIED");
  if (s.automatedCalculation.overlapDays > 0) s.warnings.push("OVERLAPPING_SERVICE");
  return s;
}
