/**
 * Validation engine — v0.7.0.
 * Returns codes; the UI translates them (see examinerI18n.js).
 * Certificate eligibility is intentionally out of scope for this build.
 * Conversion (TP 2293) warnings are surfaced as line warnings.
 *
 * v0.7.0: examiner checks never block saving. "Errors" are kept for values that
 * cannot be used (negative or fractional days, impossible dates); everything else —
 * including a missing adjustment reason — is a warning shown on the line.
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
  const ice = iceIssues(voyage);
  for (const code of ice.errors) if (!errors.includes(code)) errors.push(code);
  for (const code of ice.warnings) if (!warnings.includes(code)) warnings.push(code);
  for (const w of voyage.metadata?.legacyWarnings || []) warnings.push(w);
  const calc = voyage.calculation || {};
  for (const w of [...(calc.errors || []), ...(calc.warnings || [])]) {
    if (!errors.includes(w) && !warnings.includes(w)) warnings.push(w);
  }
  return { valid: errors.length === 0, errors, warnings };
}

/** Column K (v0.7.0): days entered for each selected ice condition. */
export function iceIssues(voyage) {
  const errors = [];
  const warnings = [];
  const conditions = voyage.specializedService?.iceConditions || {};
  const onBoard = voyage.dates.daysOnBoard;
  const add = (list, code) => { if (!list.includes(code)) list.push(code); };
  for (const code of ENUMS.iceConditions) {
    const c = conditions[code];
    if (!c || !c.selected) continue;
    if (c.days === null || c.days === undefined) { add(warnings, "ICE_DAYS_NOT_STATED"); continue; }
    if (c.days < 0 || !Number.isInteger(c.days)) { add(errors, "ICE_DAYS_INVALID"); continue; }
    if (onBoard !== null && onBoard !== undefined && c.days > onBoard) add(errors, "ICE_DAYS_EXCEED_ONBOARD");
  }
  return { errors, warnings };
}

export function validateExaminerReview(voyage) {
  const r = voyage.examinerReview;
  const errors = [];
  const warnings = [];
  const accepted = ["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT"].includes(r.reviewStatus);
  const final = r.finalAcceptedDays;

  // Errors: values that cannot be counted.
  if (!ENUMS.examinerBasis.includes(r.examinerBasis)) errors.push("INVALID_EXAMINER_BASIS");
  if (final !== null && (!Number.isFinite(Number(final)) || Number(final) < 0)) errors.push("NEGATIVE_FINAL_ACCEPTED_DAYS");
  else if (final !== null && !Number.isInteger(Number(final))) errors.push("FINAL_ACCEPTED_DAYS_NOT_WHOLE");

  // Warnings: shown clearly, never block saving.
  if (r.statusSetAutomatically) warnings.push("STATUS_SET_AUTOMATICALLY");
  if (reasonMissing(voyage)) warnings.push("ADJUSTMENT_REASON_REQUIRED");
  if (accepted && final === null) warnings.push(r.referenceDays !== null ? "FINAL_DAYS_DEFAULTED_TO_REFERENCE" : "FINAL_ACCEPTED_DAYS_REQUIRED");
  if (r.examinerBasis === "CONVERTED_DAYS" && r.basisDays === null) warnings.push("CONVERTED_DAYS_NOT_CALCULATED");
  if (r.reviewStatus === "REJECTED" && final !== null && Number(final) !== 0) warnings.push("REJECTED_LINE_COUNTS_ZERO");
  if (r.reviewStatus === "ADDITIONAL_INFORMATION_REQUIRED" && final !== null) warnings.push("FINAL_DAYS_PENDING_INFORMATION");
  if (r.reviewStatus === "ACCEPTED" && r.adjustmentRequired) warnings.push("CONSIDER_ACCEPTED_WITH_ADJUSTMENT");
  if (final !== null && r.referenceDays !== null && Number(final) > r.referenceDays) warnings.push("FINAL_EXCEEDS_BASIS");
  if (accepted && !r.capacityVerified) warnings.push("CAPACITY_NOT_VERIFIED");
  if (accepted && voyageHasSpecializedService(voyage) && !r.specializedServiceVerified) warnings.push("SPECIALIZED_SERVICE_NOT_VERIFIED");
  return { valid: errors.length === 0, errors, warnings };
}

/** True when an adjustment reason is needed (whether or not one has been entered). */
export function reasonNeeded(voyage) {
  const r = voyage.examinerReview;
  return r.reviewStatus !== "REJECTED" && (r.adjustmentRequired || r.reviewStatus === "ACCEPTED_WITH_ADJUSTMENT");
}
/** True only while a needed reason is still empty. */
export function reasonMissing(voyage) {
  return reasonNeeded(voyage) && !String(voyage.examinerReview.adjustmentReason || "").trim();
}

export function voyageHasSpecializedService(voyage) {
  const s = voyage.specializedService;
  return s.iceService !== "NONE" || s.passengerService || s.transferOperation !== "NONE" || s.fishingService || s.dpOffshoreService !== "NONE";
}
