/**
 * Calculation engine — v0.8.0 (shared by the production and development pages).
 *
 * Candidate day counts, examiner-basis resolution and the entry point to the
 * TP 2293 / MPR conversion engine (tp2293Engine.js).
 * Converted days are null when they cannot be calculated — never zero.
 */
import { serviceDaysOnBoard, convertAll } from "./tp2293Engine.js";
import { ENUMS, createIceConditions, iceServiceFromConditions } from "./dataModel.js";

/**
 * Inclusive calendar-day count (kept for reference / backward compatibility).
 * NOT used for sea service: see serviceDaysOnBoard (TP 2293 s. 3.3(4)).
 */
export function inclusiveDays(embarkationDate, disembarkationDate) {
  if (!embarkationDate || !disembarkationDate) return null;
  const start = new Date(`${embarkationDate}T00:00:00`);
  const end = new Date(`${disembarkationDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.round((end - start) / 86400000) + 1;
}

/** Convert "", undefined and non-numeric values to null; keep numbers. */
export function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Recompute days on board / days at sea from the candidate entries.
 * - Both dates present: days on board = discharge − engagement, the engagement and
 *   discharge days together counting as one day (TP 2293 s. 3.3(4), Table 1 (A)).
 * - No dates at all: a legacy day count already on the record is retained.
 * - Only one date: days on board are null (incomplete).
 */
export function updateCandidateDays(voyage) {
  const d = voyage.dates;
  const hasStart = Boolean(d.embarkationDate);
  const hasEnd = Boolean(d.disembarkationDate);
  if (hasStart && hasEnd) d.daysOnBoard = serviceDaysOnBoard(d.embarkationDate, d.disembarkationDate);
  else if (hasStart || hasEnd) d.daysOnBoard = null;
  else d.daysOnBoard = toNumberOrNull(d.daysOnBoard);

  const entered = toNumberOrNull(d.daysAtSeaEntered);
  d.daysAtSeaEntered = entered;
  d.daysAtSeaEffective = entered === null ? d.daysOnBoard : entered;
  d.daysAtSeaDifferent = entered !== null && entered !== d.daysOnBoard;
  syncIceService(voyage);
  return voyage;
}

/**
 * Column K (v0.7.0): normalise the ice conditions (several may be selected, each
 * with its own number of days) and keep the combined legacy code iceService in step.
 * Entering a number of days selects the condition.
 */
export function syncIceService(voyage) {
  const s = voyage.specializedService;
  if (!s.iceConditions || typeof s.iceConditions !== "object") s.iceConditions = createIceConditions();
  for (const code of ENUMS.iceConditions) {
    const c = s.iceConditions[code] || (s.iceConditions[code] = { selected: false, days: null });
    c.days = toNumberOrNull(c.days);
    if (c.days !== null && c.days > 0) c.selected = true;
    c.selected = Boolean(c.selected);
  }
  s.iceService = iceServiceFromConditions(s.iceConditions);
  return voyage;
}

/** Days corresponding to the examiner's selected basis (null if unavailable). */
export function getBasisDays(voyage) {
  switch (voyage.examinerReview.examinerBasis) {
    case "DAYS_ON_BOARD": return toNumberOrNull(voyage.dates.daysOnBoard);
    case "DAYS_AT_SEA": return toNumberOrNull(voyage.dates.daysAtSeaEffective);
    case "CONVERTED_DAYS": return calculatedDays(voyage);
    default: return null; // NONE and MANUAL_DETERMINATION have no automatic basis
  }
}

const calculatedDays = (voyage) =>
  voyage.calculation?.conversionStatus === "CALCULATED" ? toNumberOrNull(voyage.calculation.convertedDays) : null;

/** v0.8.0 — statuses for which the examiner may enter Final accepted days. */
export const FINAL_DAYS_STATUSES = Object.freeze(["ACCEPTED_WITH_ADJUSTMENT", "ADDITIONAL_INFORMATION_REQUIRED"]);
export const finalDaysEnabled = (status) => FINAL_DAYS_STATUSES.includes(status);

/**
 * v0.8.0 — the examiner basis was removed: the reference value is always the
 * calculated converted days (column T). examinerBasis stays in older records but is not used.
 */
export function getReference(voyage) {
  return { days: calculatedDays(voyage), source: "CONVERTED_DAYS" };
}

const isWholeNonNegative = (n) => n !== null && Number.isInteger(n) && n >= 0;

/**
 * v0.8.0 — figure counted in the examiner totals for one line:
 *  - Accepted                         → the converted days (0 when the line could not be calculated)
 *  - Accepted with adjustment         → the final accepted days (0 until entered)
 *  - Additional information required  → the final accepted days if entered, otherwise 0
 *  - Rejected / not yet reviewed      → 0
 */
export function effectiveAcceptedDays(voyage) {
  const r = voyage.examinerReview;
  switch (r.reviewStatus) {
    case "ACCEPTED":
      return r.referenceDays !== null ? { days: r.referenceDays, source: "CONVERTED_DAYS" } : { days: 0, source: "NONE" };
    case "ACCEPTED_WITH_ADJUSTMENT":
    case "ADDITIONAL_INFORMATION_REQUIRED":
      if (r.finalAcceptedDays === null) return { days: 0, source: "NONE" };
      return isWholeNonNegative(r.finalAcceptedDays) ? { days: r.finalAcceptedDays, source: "FINAL" } : { days: 0, source: "INVALID_FINAL" };
    case "REJECTED":
      return { days: 0, source: "REJECTED" };
    default:
      return { days: 0, source: "NONE" };
  }
}

/**
 * Refresh referenceDays, adjustmentRequired and the counted figure.
 * Final accepted days are kept only for "Accepted with adjustment" and
 * "Additional information required"; for any other status they are cleared.
 * An adjustment reason is needed when the final days differ from the converted days
 * (or there are no converted days); "Accepted with adjustment" always needs one.
 */
export function updateExaminerBasis(voyage) {
  const r = voyage.examinerReview;
  r.finalAcceptedDays = toNumberOrNull(r.finalAcceptedDays);
  if (!finalDaysEnabled(r.reviewStatus)) r.finalAcceptedDays = null;
  if (!r.examinerBasis) r.examinerBasis = "NONE";
  r.basisDays = null;
  r.statusSetAutomatically = false;
  const ref = getReference(voyage);
  r.referenceDays = ref.days;
  r.referenceSource = ref.source;
  const final = r.finalAcceptedDays;
  r.adjustmentRequired = final !== null && (ref.days === null || final !== ref.days);
  const eff = effectiveAcceptedDays(voyage);
  r.effectiveAcceptedDays = eff.days;
  r.acceptedDaysSource = eff.source;
  return voyage;
}

/**
 * v0.8.0 — bring examiner reviews saved by v0.6/v0.7 to the v0.8.0 rules without
 * losing the examiner's figure (run when a record is loaded, not while typing):
 *  - Accepted or Not reviewed with final days equal to the converted days → Accepted (final cleared);
 *  - Accepted or Not reviewed with other final days → Accepted with adjustment (final kept);
 *  - Rejected → final days cleared.
 * A line warning REVIEW_STATUS_CONVERTED_V080 records the change.
 */
export function normaliseLegacyReview(voyage) {
  const r = voyage.examinerReview;
  const final = toNumberOrNull(r.finalAcceptedDays);
  if (final === null || finalDaysEnabled(r.reviewStatus)) return voyage;
  const converted = calculatedDays(voyage);
  const before = r.reviewStatus;
  if (r.reviewStatus === "ACCEPTED" || r.reviewStatus === "NOT_REVIEWED") {
    r.reviewStatus = final === converted ? "ACCEPTED" : "ACCEPTED_WITH_ADJUSTMENT";
  }
  if (r.reviewStatus !== "ACCEPTED_WITH_ADJUSTMENT") r.finalAcceptedDays = null;
  if (r.reviewStatus !== before || r.finalAcceptedDays === null) {
    voyage.metadata.legacyWarnings = voyage.metadata.legacyWarnings || [];
    if (!voyage.metadata.legacyWarnings.includes("REVIEW_STATUS_CONVERTED_V080")) voyage.metadata.legacyWarnings.push("REVIEW_STATUS_CONVERTED_V080");
  }
  return voyage;
}

/**
 * Full recalculation of a record's lines: candidate days, TP 2293 conversion,
 * overlap check, then the examiner basis (which may point at converted days).
 */
export function recalculateVoyages(voyages) {
  voyages.forEach(updateCandidateDays);
  convertAll(voyages);
  voyages.forEach(normaliseLegacyReview);
  voyages.forEach(updateExaminerBasis);
  return voyages;
}

/** Reset the conversion fields to "not calculated" (null, never 0). */
export function reserveConvertedDays(voyage) {
  voyage.calculation.conversionStatus = "NOT_CALCULATED";
  voyage.calculation.conversionRate = null;
  voyage.calculation.convertedDays = null;
  return voyage;
}
