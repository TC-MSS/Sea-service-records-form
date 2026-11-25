/**
 * Summary engine — v0.5.0 development build.
 *
 * Distinguishes four totals:
 *  - total days on board    (candidate claim, column R)
 *  - total days at sea      (candidate claim, column S or R when S is blank)
 *  - total converted days   (TP 2293 / MPR credited days; null when no line could be calculated)
 *  - total final accepted   (examiner determination; ACCEPTED and ACCEPTED_WITH_ADJUSTMENT lines only)
 */
import { createEmptySummary } from "./dataModel.js";
import { totals as conversionTotals, RULES_VERSION } from "./tp2293Engine.js";

export function buildSummary(voyages = []) {
  const s = createEmptySummary();
  s.examinerDetermination.recordsNotReviewed = 0;
  for (const v of voyages) {
    s.candidateClaim.totalDaysOnBoard += Number(v.dates.daysOnBoard ?? 0);
    s.candidateClaim.totalDaysAtSea += Number(v.dates.daysAtSeaEffective ?? 0);

    const r = v.examinerReview;
    const e = s.examinerDetermination;
    if (r.reviewStatus === "NOT_REVIEWED") e.recordsNotReviewed += 1; else e.recordsReviewed += 1;
    if (r.reviewStatus === "ACCEPTED") e.recordsAccepted += 1;
    if (r.reviewStatus === "ACCEPTED_WITH_ADJUSTMENT") e.recordsAcceptedWithAdjustment += 1;
    if (r.reviewStatus === "REJECTED") e.recordsRejected += 1;
    if (r.reviewStatus === "ADDITIONAL_INFORMATION_REQUIRED") e.recordsRequiringInformation += 1;
    if (["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT"].includes(r.reviewStatus) && r.finalAcceptedDays !== null) {
      e.totalFinalAcceptedDays += Number(r.finalAcceptedDays);
    }
  }
  s.examinerDetermination.totalFinalAcceptedMonths = Math.floor((s.examinerDetermination.totalFinalAcceptedDays / 30) * 100) / 100;
  s.automatedCalculation = { ...s.automatedCalculation, ...conversionTotals(voyages), rulesVersion: RULES_VERSION };
  if (s.automatedCalculation.juniorOfficerExcessDays > 0) s.warnings.push("JUNIOR_OFFICER_CAP_APPLIED");
  if (s.automatedCalculation.overlapDays > 0) s.warnings.push("OVERLAPPING_SERVICE");
  return s;
}
