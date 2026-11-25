/**
 * Summary engine — v0.5.0 development build.
 *
 * Distinguishes four totals:
 *  - total days on board    (candidate claim, column R)
 *  - total days at sea      (candidate claim, column S or R when S is blank)
 *  - total converted days   (null = "Not calculated" until TP 2293 rates are implemented)
 *  - total final accepted   (examiner determination; ACCEPTED and ACCEPTED_WITH_ADJUSTMENT lines only)
 */
import { createEmptySummary } from "./dataModel.js";

export function buildSummary(voyages = []) {
  const s = createEmptySummary();
  s.examinerDetermination.recordsNotReviewed = 0;
  for (const v of voyages) {
    s.candidateClaim.totalDaysOnBoard += Number(v.dates.daysOnBoard ?? 0);
    s.candidateClaim.totalDaysAtSea += Number(v.dates.daysAtSeaEffective ?? 0);

    const c = v.calculation;
    if (c.conversionStatus === "CALCULATED" && c.convertedDays !== null) {
      s.automatedCalculation.recordsCalculated += 1;
      s.automatedCalculation.totalConvertedDays = Number(s.automatedCalculation.totalConvertedDays ?? 0) + Number(c.convertedDays);
    } else if (c.conversionStatus === "MANUAL_REVIEW_REQUIRED") s.automatedCalculation.recordsRequiringManualReview += 1;
    else s.automatedCalculation.recordsNotCalculated += 1;

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
  return s;
}
