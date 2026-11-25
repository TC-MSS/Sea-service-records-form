/**
 * Calculation engine — v0.6.0 development build.
 *
 * Candidate day counts, examiner-basis resolution and the entry point to the
 * TP 2293 / MPR conversion engine (tp2293Engine.js).
 * Converted days are null when they cannot be calculated — never zero.
 */
import { serviceDaysOnBoard, convertAll } from "./tp2293Engine.js";

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
  return voyage;
}

/** Days corresponding to the examiner's selected basis (null if unavailable). */
export function getBasisDays(voyage) {
  switch (voyage.examinerReview.examinerBasis) {
    case "DAYS_ON_BOARD": return toNumberOrNull(voyage.dates.daysOnBoard);
    case "DAYS_AT_SEA": return toNumberOrNull(voyage.dates.daysAtSeaEffective);
    case "CONVERTED_DAYS": return toNumberOrNull(voyage.calculation.convertedDays);
    default: return null; // NONE and MANUAL_DETERMINATION have no automatic basis
  }
}

/**
 * Refresh basisDays and adjustmentRequired.
 * An adjustment reason is required when final accepted days are entered and
 * differ from the basis days, or when the basis is a manual determination.
 */
export function updateExaminerBasis(voyage) {
  const r = voyage.examinerReview;
  r.finalAcceptedDays = toNumberOrNull(r.finalAcceptedDays);
  r.basisDays = getBasisDays(voyage);
  const accepted = r.finalAcceptedDays;
  r.adjustmentRequired = accepted !== null && (
    r.examinerBasis === "MANUAL_DETERMINATION" ||
    (r.examinerBasis !== "NONE" && accepted !== r.basisDays)
  );
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
