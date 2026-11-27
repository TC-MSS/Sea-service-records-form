/**
 * Summary engine — v0.9.0.
 *
 * Distinguishes four totals:
 *  - total days on board    (candidate claim, column R)
 *  - total days at sea      (candidate claim, column S or R when S is blank)
 *  - total converted days   (TP 2293 / MPR credited days; null when no line could be calculated)
 *  - total final accepted   (examiner determination — v0.7.0: the examiner's final days override
 *                            every other figure; rejected lines count 0; accepted lines without
 *                            final days count their reference value)
 * plus the column K ice-condition days (v0.7.0) and, from v0.8.0, the approved days
 * per special service (see approvedSpecialServiceDays).
 */
import { createEmptySummary } from "./dataModel.js";
import { totals as conversionTotals, RULES_VERSION } from "./tp2293Engine.js";
import { reasonMissing } from "./validationEngine.js";
import { lineAutomaticServiceDays, lineFinalServiceDays, VETTED_SERVICES } from "./serviceVetting.js";

const months = (days) => Math.floor((days / 30) * 100) / 100;

export function buildSummary(voyages = []) {
  const s = createEmptySummary();
  const e = s.examinerDetermination;
  for (const v of voyages) {
    s.candidateClaim.totalDaysOnBoard += Number(v.dates.daysOnBoard ?? 0);
    s.candidateClaim.totalDaysAtSea += Number(v.dates.daysAtSeaEffective ?? 0);

    const ice = v.specializedService?.iceConditions || {};
    if (ice.POLAR?.selected) s.specializedService.polarDays += Number(ice.POLAR.days ?? 0);
    if (ice.ACCEPTABLE_ICE?.selected) s.specializedService.acceptableIceDays += Number(ice.ACCEPTABLE_ICE.days ?? 0);

    const r = v.examinerReview;
    if (r.reviewStatus === "NOT_REVIEWED") e.recordsNotReviewed += 1; else e.recordsReviewed += 1;
    if (r.reviewStatus === "ACCEPTED") e.recordsAccepted += 1;
    if (r.reviewStatus === "ACCEPTED_WITH_ADJUSTMENT") e.recordsAcceptedWithAdjustment += 1;
    if (r.reviewStatus === "REJECTED") e.recordsRejected += 1;
    if (r.reviewStatus === "ADDITIONAL_INFORMATION_REQUIRED") e.recordsRequiringInformation += 1;
    if (r.finalAcceptedDays !== null && r.reviewStatus !== "REJECTED") e.linesWithFinalDays += 1;
    if (reasonMissing(v)) e.linesMissingAdjustmentReason += 1;
    e.totalFinalAcceptedDays += Number(r.effectiveAcceptedDays ?? 0);
  }
  e.totalFinalAcceptedMonths = months(e.totalFinalAcceptedDays);
  s.automatedCalculation = { ...s.automatedCalculation, ...conversionTotals(voyages), rulesVersion: RULES_VERSION };
  const converted = s.automatedCalculation.totalConvertedDays;
  e.differenceFromConverted = converted === null ? null : e.totalFinalAcceptedDays - converted;
  // v0.9.0 — final figures (examiner-adjusted where vetted) and the automatic figures for comparison.
  e.specialServiceApprovedDays = approvedSpecialServiceDays(voyages, lineFinalServiceDays);
  e.specialServiceAutomaticDays = approvedSpecialServiceDays(voyages, lineAutomaticServiceDays);
  e.specialServiceAdjusted = Object.fromEntries(Object.keys(e.specialServiceApprovedDays).map((code) => [code,
    VETTED_SERVICES.includes(code) && voyages.some((v) => v.examinerReview?.serviceReview?.[code]?.adjusted)]));
  if (s.automatedCalculation.juniorOfficerExcessDays > 0) s.warnings.push("JUNIOR_OFFICER_CAP_APPLIED");
  if (s.automatedCalculation.overlapDays > 0) s.warnings.push("OVERLAPPING_SERVICE");
  return s;
}

/** v0.8.0 — special services, in display order. */
export const SPECIAL_SERVICES = Object.freeze([
  "POLAR", "ACCEPTABLE_ICE", "PASSENGER", "OIL_TRANSFER", "CHEMICAL_TRANSFER", "GAS_TRANSFER", "FISHING", "DP", "OFFSHORE"
]);

/** Kept for compatibility (v0.8.0 name): automatic days a line contributes to a service. */
export const lineSpecialServiceDays = lineAutomaticServiceDays;

const DAY_MS = 86400000;
function dayNumber(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const c = new Date(t);
  return c.getUTCFullYear() === y && c.getUTCMonth() === m - 1 && c.getUTCDate() === d ? t / DAY_MS : null;
}

/**
 * Total approved days per special service, without duplication (v0.8.0; v0.9.0: lineDays selects
 * the final (examiner) or automatic line figures).
 * Each line's approved days for the service are spread evenly over its service days
 * (engagement day up to the day before discharge, as in TP 2293 s. 3.3(4); one day when
 * engaged and discharged the same day). Where lines with the same service overlap, each
 * calendar day counts once, at the highest daily value. Lines without dates are added as they are.
 * Only services selected on at least one line are returned. Results are rounded down.
 */
export function approvedSpecialServiceDays(voyages = [], lineDays = lineFinalServiceDays) {
  const out = {};
  for (const service of SPECIAL_SERVICES) {
    const lines = voyages.map((v) => ({ v, days: lineDays(v, service) })).filter((x) => x.days !== null);
    if (!lines.length) continue;
    const perDay = new Map();
    let undated = 0;
    for (const { v, days } of lines) {
      if (!(days > 0)) continue;
      const s = dayNumber(v.dates?.embarkationDate), e = dayNumber(v.dates?.disembarkationDate);
      if (s === null || e === null || e < s) { undated += days; continue; }
      const span = Math.max(1, e - s);
      const rate = days / span;
      for (let d = s; d < s + span; d++) perDay.set(d, Math.max(perDay.get(d) || 0, rate));
    }
    let total = undated;
    for (const r of perDay.values()) total += r;
    out[service] = Math.floor(total + 1e-9);
  }
  return out;
}
