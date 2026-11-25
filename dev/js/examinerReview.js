/**
 * Examiner review — applies examiner input to a voyage line (v0.5.0 dev).
 */
import { updateExaminerBasis } from "./calculationEngine.js";
import { validateExaminerReview } from "./validationEngine.js";

export const EXAMINER_INPUT_FIELDS = Object.freeze([
  "reviewStatus", "vesselVerified", "capacityVerified", "datesVerified", "specializedServiceVerified",
  "supportingDocumentsVerified", "examinerBasis", "finalAcceptedDays", "adjustmentReason", "examinerComments"
]);

/**
 * Apply examiner input. Values are stored even when invalid so the examiner
 * does not lose work; reviewedAt is only stamped when the line is valid and
 * has a status other than NOT_REVIEWED.
 */
export function applyExaminerReview(voyage, input = {}, examiner = null) {
  for (const key of EXAMINER_INPUT_FIELDS) if (key in input) voyage.examinerReview[key] = input[key];
  updateExaminerBasis(voyage);
  const result = validateExaminerReview(voyage);
  if (result.valid && voyage.examinerReview.reviewStatus !== "NOT_REVIEWED") {
    voyage.examinerReview.reviewedAt = new Date().toISOString();
    if (examiner) voyage.examinerReview.reviewedBy = examiner;
  }
  return { ...result, voyage };
}
