/**
 * Calculation engine — v0.7.0 (shared by the production and development pages).
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

/**
 * v0.7.0 — reference value for the final accepted days.
 * The examiner basis is optional and informative: with no basis, the final days
 * are compared with the calculated converted days.
 */
export function getReference(voyage) {
  const basis = voyage.examinerReview.examinerBasis;
  if (basis === "MANUAL_DETERMINATION") return { days: null, source: "MANUAL_DETERMINATION" };
  if (basis && basis !== "NONE") return { days: getBasisDays(voyage), source: basis };
  return { days: calculatedDays(voyage), source: "CONVERTED_DAYS" };
}

const isWholeNonNegative = (n) => n !== null && Number.isInteger(n) && n >= 0;

/**
 * v0.7.0 — figure counted in the examiner totals for one line:
 *  - Rejected                         → 0
 *  - Final accepted days entered      → the final days (override everything)
 *  - Accepted / Accepted with adj., no final days → the reference value (or 0)
 *  - anything else                     → 0
 */
export function effectiveAcceptedDays(voyage) {
  const r = voyage.examinerReview;
  if (r.reviewStatus === "REJECTED") return { days: 0, source: "REJECTED" };
  if (r.finalAcceptedDays !== null) {
    return isWholeNonNegative(r.finalAcceptedDays) ? { days: r.finalAcceptedDays, source: "FINAL" } : { days: 0, source: "INVALID_FINAL" };
  }
  if (["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT"].includes(r.reviewStatus) && r.referenceDays !== null) return { days: r.referenceDays, source: "REFERENCE" };
  return { days: 0, source: "NONE" };
}

/**
 * Refresh basisDays, referenceDays, adjustmentRequired and the counted figure.
 * An adjustment reason is required when final accepted days are entered and
 * differ from the reference value (selected basis, or converted days by default),
 * when there is no reference value to compare with, or when the basis is a manual determination.
 */
export function updateExaminerBasis(voyage) {
  const r = voyage.examinerReview;
  r.finalAcceptedDays = toNumberOrNull(r.finalAcceptedDays);
  if (!r.examinerBasis) r.examinerBasis = "NONE";
  r.basisDays = getBasisDays(voyage);
  const ref = getReference(voyage);
  r.referenceDays = ref.days;
  r.referenceSource = ref.source;
  const final = r.finalAcceptedDays;
  r.adjustmentRequired = final !== null && r.reviewStatus !== "REJECTED" && (
    ref.source === "MANUAL_DETERMINATION" || ref.days === null || final !== ref.days
  );
  const eff = effectiveAcceptedDays(voyage);
  r.effectiveAcceptedDays = eff.days;
  r.acceptedDaysSource = eff.source;
  return voyage;
}

/**
 * Full recalculation of a record's lines: candidate days, TP 2293 conversion,
 * overlap check, then the examiner basis (which may point at converted days).
 */
export function recalculateVoyages(voyages) {
  voyages.forEach(updateCandidateDays);
  convertAll(voyages);
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
