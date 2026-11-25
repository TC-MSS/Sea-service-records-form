/**
 * Validation engine — v0.5.0 development build.
 * Returns codes; the UI translates them (see examinerI18n.js).
 * Certificate eligibility is intentionally out of scope for this build.
 */
import { ENUMS } from "./dataModel.js";

export function validateVoyage(voyage) {
  const errors = [];
  const warnings = [];
  const d = voyage.dates;
  if ((d.embarkationDate || d.disembarkationDate) && d.daysOnBoard === null) errors.push("INVALID_DATES");
  if (d.daysAtSeaEntered !== null && Number(d.daysAtSeaEntered) < 0) errors.push("NEGATIVE_DAYS_AT_SEA");
  if (d.daysAtSeaEntered !== null && d.daysOnBoard !== null && Number(d.daysAtSeaEntered) > d.daysOnBoard) errors.push("DAYS_AT_SEA_EXCEED_ONBOARD");
  if (!ENUMS.reviewStatus.includes(voyage.examinerReview.reviewStatus)) errors.push("INVALID_REVIEW_STATUS");
  for (const w of voyage.metadata?.legacyWarnings || []) warnings.push(w);
  return { valid: errors.length === 0, errors, warnings };
}

export function validateExaminerReview(voyage) {
  const r = voyage.examinerReview;
  const errors = [];
  const warnings = [];
  const accepted = ["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT"].includes(r.reviewStatus);
  const final = r.finalAcceptedDays;

  if (!ENUMS.examinerBasis.includes(r.examinerBasis)) errors.push("INVALID_EXAMINER_BASIS");
  if (accepted && r.examinerBasis === "NONE") errors.push("EXAMINER_BASIS_REQUIRED");
  if (accepted && final === null) errors.push("FINAL_ACCEPTED_DAYS_REQUIRED");
  if (final !== null && (!Number.isFinite(Number(final)) || Number(final) < 0)) errors.push("NEGATIVE_FINAL_ACCEPTED_DAYS");
  if (final !== null && !Number.isInteger(Number(final))) errors.push("FINAL_ACCEPTED_DAYS_NOT_WHOLE");
  if (r.examinerBasis === "CONVERTED_DAYS" && voyage.calculation.convertedDays === null) errors.push("CONVERTED_DAYS_NOT_CALCULATED");
  if ((r.reviewStatus === "ACCEPTED_WITH_ADJUSTMENT" || r.adjustmentRequired) && !String(r.adjustmentReason || "").trim()) errors.push("ADJUSTMENT_REASON_REQUIRED");
  if (r.reviewStatus === "REJECTED" && final !== null && Number(final) !== 0) errors.push("REJECTED_LINE_MUST_ACCEPT_ZERO");
  if (r.reviewStatus === "ACCEPTED" && r.adjustmentRequired) warnings.push("CONSIDER_ACCEPTED_WITH_ADJUSTMENT");
  if (final !== null && r.basisDays !== null && Number(final) > r.basisDays) warnings.push("FINAL_EXCEEDS_BASIS");
  if (accepted && !r.capacityVerified) warnings.push("CAPACITY_NOT_VERIFIED");
  if (accepted && voyageHasSpecializedService(voyage) && !r.specializedServiceVerified) warnings.push("SPECIALIZED_SERVICE_NOT_VERIFIED");
  return { valid: errors.length === 0, errors, warnings };
}

export function voyageHasSpecializedService(voyage) {
  const s = voyage.specializedService;
  return s.iceService !== "NONE" || s.passengerService || s.transferOperation !== "NONE" || s.fishingService || s.dpOffshoreService !== "NONE";
}
