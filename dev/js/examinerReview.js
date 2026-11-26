/**
 * Examiner review — applies examiner input to a voyage line (v0.7.0).
 *
 * v0.7.0 — Final accepted days override everything (TP 2293 figures are a reference):
 *  - the examiner basis is optional; without one the final days are compared with the converted days;
 *  - entering final days on a "Not reviewed" line sets the status automatically:
 *    "Accepted" when the final days equal the reference value, otherwise "Accepted with adjustment";
 *    while the status remains automatic it follows later changes to the final days, and clearing
 *    the final days returns the line to "Not reviewed". Choosing a status by hand ends the automatic mode.
 */
import { updateExaminerBasis } from "./calculationEngine.js";
import { validateExaminerReview } from "./validationEngine.js";

export const EXAMINER_INPUT_FIELDS = Object.freeze([
  "reviewStatus", "vesselVerified", "capacityVerified", "datesVerified", "specializedServiceVerified",
  "supportingDocumentsVerified", "examinerBasis", "finalAcceptedDays", "adjustmentReason", "examinerComments"
]);

const ACCEPTED_STATES = ["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT"];

/** Apply the automatic status rule (4(d)). Returns true when the status was changed. */
export function applyAutomaticStatus(voyage) {
  const r = voyage.examinerReview;
  const before = r.reviewStatus;
  const auto = r.adjustmentRequired ? "ACCEPTED_WITH_ADJUSTMENT" : "ACCEPTED";
  if (r.finalAcceptedDays !== null && r.reviewStatus === "NOT_REVIEWED") {
    r.reviewStatus = auto;
    r.statusSetAutomatically = true;
  } else if (r.statusSetAutomatically && r.finalAcceptedDays !== null && ACCEPTED_STATES.includes(r.reviewStatus)) {
    r.reviewStatus = auto;
  } else if (r.statusSetAutomatically && r.finalAcceptedDays === null) {
    r.reviewStatus = "NOT_REVIEWED";
    r.statusSetAutomatically = false;
  }
  if (r.reviewStatus !== before) updateExaminerBasis(voyage);
  return r.reviewStatus !== before;
}

/**
 * Apply examiner input. Values are stored even when invalid so the examiner
 * does not lose work; reviewedAt is only stamped when the line has no errors and
 * a status other than NOT_REVIEWED. Nothing here blocks saving.
 */
export function applyExaminerReview(voyage, input = {}, examiner = null) {
  const r = voyage.examinerReview;
  const previousStatus = r.reviewStatus;
  for (const key of EXAMINER_INPUT_FIELDS) if (key in input) r[key] = input[key];
  if ("reviewStatus" in input && input.reviewStatus !== previousStatus) r.statusSetAutomatically = false; // chosen by hand
  updateExaminerBasis(voyage);
  const statusChanged = applyAutomaticStatus(voyage);
  const result = validateExaminerReview(voyage);
  if (result.valid && r.reviewStatus !== "NOT_REVIEWED") {
    r.reviewedAt = new Date().toISOString();
    if (examiner) r.reviewedBy = examiner;
  }
  return { ...result, voyage, statusChanged };
}
