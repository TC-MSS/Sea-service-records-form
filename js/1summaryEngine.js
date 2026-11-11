import { createEmptySummary } from "./dataModel.js";

export function buildSummary(voyages = []) {
  const s = createEmptySummary();
  for (const v of voyages) {
    const onboard = Number(v.dates.daysOnBoard || 0);
    const atSea = Number(v.dates.daysAtSeaEffective || 0);
    const reviewedDays = Number(v.examinerReview.finalAcceptedDays || 0);
    s.candidateClaim.totalDaysOnBoard += onboard;
    s.candidateClaim.totalDaysAtSea += atSea;
    if (v.calculation.conversionStatus === "CALCULATED") {
      s.automatedCalculation.recordsCalculated += 1;
      s.automatedCalculation.totalConvertedDays = Number(s.automatedCalculation.totalConvertedDays || 0) + Number(v.calculation.convertedDays || 0);
    } else if (v.calculation.conversionStatus === "MANUAL_REVIEW_REQUIRED") s.automatedCalculation.recordsRequiringManualReview += 1;
    else s.automatedCalculation.recordsNotCalculated += 1;

    const status = v.examinerReview.reviewStatus;
    if (status !== "NOT_REVIEWED") s.examinerDetermination.recordsReviewed += 1;
    if (status === "ACCEPTED") s.examinerDetermination.recordsAccepted += 1;
    if (status === "ACCEPTED_WITH_ADJUSTMENT") s.examinerDetermination.recordsAcceptedWithAdjustment += 1;
    if (status === "REJECTED") s.examinerDetermination.recordsRejected += 1;
    if (status === "ADDITIONAL_INFORMATION_REQUIRED") s.examinerDetermination.recordsRequiringInformation += 1;
    if (["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT"].includes(status)) s.examinerDetermination.totalFinalAcceptedDays += reviewedDays;
  }
  return s;
}
