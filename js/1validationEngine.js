import { ENUMS } from "./dataModel.js";

export function validateVoyage(voyage) {
  const errors = [];
  const warnings = [];
  const d = voyage.dates;
  if ((d.embarkationDate || d.disembarkationDate) && d.daysOnBoard === null) errors.push("INVALID_DATES");
  if (d.daysAtSeaEntered !== null && Number(d.daysAtSeaEntered) < 0) errors.push("NEGATIVE_DAYS_AT_SEA");
  if (d.daysAtSeaEntered !== null && d.daysOnBoard !== null && Number(d.daysAtSeaEntered) > d.daysOnBoard) errors.push("DAYS_AT_SEA_EXCEED_ONBOARD");
  if (!ENUMS.reviewStatus.includes(voyage.examinerReview.reviewStatus)) errors.push("INVALID_REVIEW_STATUS");
  return { valid: errors.length === 0, errors, warnings };
}

export function validateExaminerReview(voyage) {
  const r = voyage.examinerReview;
  const errors = [];
  if (["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT"].includes(r.reviewStatus) && r.finalAcceptedDays === null) errors.push("FINAL_ACCEPTED_DAYS_REQUIRED");
  if (r.finalAcceptedDays !== null && Number(r.finalAcceptedDays) < 0) errors.push("NEGATIVE_FINAL_ACCEPTED_DAYS");
  if (r.examinerBasis === "CONVERTED_DAYS" && voyage.calculation.convertedDays === null) errors.push("CONVERTED_DAYS_NOT_CALCULATED");
  if ((r.reviewStatus === "ACCEPTED_WITH_ADJUSTMENT" || r.adjustmentRequired) && !r.adjustmentReason.trim()) errors.push("ADJUSTMENT_REASON_REQUIRED");
  if (r.reviewStatus === "REJECTED" && Number(r.finalAcceptedDays || 0) !== 0) errors.push("REJECTED_LINE_MUST_ACCEPT_ZERO");
  return { valid: errors.length === 0, errors };
}
