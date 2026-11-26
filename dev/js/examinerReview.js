/**
 * Examiner review — applies examiner input to a voyage line (v0.8.0).
 *
 * v0.8.0:
 *  - The examiner basis was removed; final accepted days are compared with the converted days.
 *  - Final accepted days can be entered only for "Accepted with adjustment" and
 *    "Additional information required"; "Accepted" counts the converted days.
 *  - "Not reviewed" is no longer a choice: it is only the starting state ("Select a status").
 *  - The automatic status of v0.7.0 is removed.
 */
import { updateExaminerBasis } from "./calculationEngine.js";
import { validateExaminerReview } from "./validationEngine.js";

export const EXAMINER_INPUT_FIELDS = Object.freeze([
  "reviewStatus", "vesselVerified", "capacityVerified", "datesVerified", "specializedServiceVerified",
  "supportingDocumentsVerified", "finalAcceptedDays", "adjustmentReason", "examinerComments"
]);

/**
 * Apply examiner input. Values are stored even when invalid so the examiner
 * does not lose work; reviewedAt is only stamped when the line has no errors and
 * a status has been chosen. Nothing here blocks saving.
 */
export function applyExaminerReview(voyage, input = {}, examiner = null) {
  const r = voyage.examinerReview;
  for (const key of EXAMINER_INPUT_FIELDS) if (key in input) r[key] = input[key];
  updateExaminerBasis(voyage);
  const result = validateExaminerReview(voyage);
  if (result.valid && r.reviewStatus !== "NOT_REVIEWED") {
    r.reviewedAt = new Date().toISOString();
    if (examiner) r.reviewedBy = examiner;
  }
  return { ...result, voyage };
}
