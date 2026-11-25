/**
 * TP 2293 / Marine Personnel Regulations — sea service conversion engine.
 *
 * Rules implemented (see dev/docs/CALCULATION_RULES.md for the full table):
 *  R1  Days on board       TP 2293 s. 3.3(1),(4), Table 1 (A): discharge date − engagement date;
 *                          the engagement and discharge days together count as one day (minimum 1).
 *  R2  8-hour day          MPR s. 115(1): 8 hours of service = 1 day of sea service.
 *  R3  Watch proration     MPR s. 115(2), TP 2293 s. 3.5(1): watches other than 8 h prorated to a
 *                          maximum of 12 h (12-h watch = 1.5 days), i.e. factor = min(h, 12) / 8.
 *  R4  Cadets              MPR s. 115(2): approved cadet program — any service in a calendar day = 1 day.
 *  R5  Days under way      TP 2293 s. 3.7(1) (MPR s. 116), used when "days at sea" differs from days on board:
 *                          8-h watch: min(1.5 × B, A);  12-h watch: min(2.25 × B, 1.5 × A).
 *  R6  Junior officer      MPR s. 117: supernumerary (junior) officer to the OOW = 2/3, max 9 months (270 days).
 *  R7  Months              MPR s. 115(3): months = credited days ÷ 30.
 *  R8  No overlap          TP 2293 s. 3.3(2),(3): days cannot be counted twice (flagged, not auto-deducted).
 *  Manual review flags     TP 2293 s. 3.20–3.21 (MOU not under way / not on DP), s. 3.25 (barge),
 *                          s. 3.24 (air cushion vessel mass), s. 3.3(6)/3.5(1) (attestation for > 8-h watches).
 *
 * Credited days are rounded DOWN to whole days (no partial day is credited);
 * the unrounded value is kept in calculation.convertedDaysExact.
 */

export const RULES_VERSION = "TP2293-CH3_MPR-115-117_v1.0";
export const JUNIOR_OFFICER_MAX_DAYS = 270; // 9 months × 30 (MPR s. 115(3), s. 117)
export const CADET_CAPACITIES = Object.freeze(["DECK_CADET", "ENGINEER_CADET"]);
export const JUNIOR_OFFICER_CAPACITIES = Object.freeze(["SUPERNUMERARY_MATE"]);
export const DECK_CAPACITIES = Object.freeze(["MASTER", "CHIEF_MATE", "MATE", "SUPERNUMERARY_MATE", "ABLE_SEAFARER_DECK", "BRIDGE_WATCH_RATING", "DECK_CADET"]);

const DAY_MS = 86400000;

function parseDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const check = new Date(t);
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d ? t : null;
}

/** R1 — TP 2293 s. 3.3 / Table 1 (A). Null if dates are missing or reversed. */
export function serviceDaysOnBoard(engagementDate, dischargeDate) {
  const s = parseDate(engagementDate), e = parseDate(dischargeDate);
  if (s === null || e === null || e < s) return null;
  return Math.max(1, Math.round((e - s) / DAY_MS));
}

const round2 = (n) => Math.round(n * 100) / 100;
const fmt = (n, lang) => {
  const s = String(round2(n));
  return lang === "fr" ? s.replace(".", ",") : s;
};

/**
 * Compute the conversion for one voyage line. Pure: returns a calculation object.
 * @param {object} voyage v0.5.0 voyage (dates.daysOnBoard and daysAtSea* already set)
 */
export function convertVoyage(voyage) {
  const A = voyage.dates.daysOnBoard;
  const B = voyage.dates.daysAtSeaDifferent ? voyage.dates.daysAtSeaEntered : null;
  const capacity = voyage.service.capacityCode || "";
  const vesselType = voyage.vessel.vesselTypeCode || "";
  const dpo = voyage.specializedService?.dpOffshoreService || "NONE";
  const rawHours = voyage.service.watchHours;
  const warnings = [];
  const steps = [];        // [{en, fr}]
  const refs = [];

  const out = {
    sourceType: null, sourceDays: null, conversionStatus: "NOT_CALCULATED", conversionRate: null,
    convertedDays: null, convertedDaysExact: null, calculationRuleId: null, calculationRuleVersion: RULES_VERSION,
    legalReference: { document: "TP 2293 Ch. 3; MPR (SOR/2007-115)", section: null },
    explanationEn: "", explanationFr: "", warnings, errors: []
  };

  if (A === null || A === undefined) {
    out.errors.push("DAYS_ON_BOARD_REQUIRED");
    out.explanationEn = "Not calculated: engagement and discharge dates are required.";
    out.explanationFr = "Non calculé : les dates d’engagement et de congédiement sont requises.";
    return out;
  }
  if (B !== null && B > A) {
    out.errors.push("DAYS_AT_SEA_EXCEED_ONBOARD");
    out.conversionStatus = "CALCULATION_ERROR";
    out.explanationEn = "Not calculated: days at sea exceed days on board.";
    out.explanationFr = "Non calculé : les jours en mer dépassent les jours à bord.";
    return out;
  }

  const isCadet = CADET_CAPACITIES.includes(capacity);
  let hours = rawHours === null || rawHours === undefined || rawHours === "" ? null : Number(rawHours);
  if (hours === null || !Number.isFinite(hours) || hours <= 0) {
    hours = 8;
    warnings.push("WATCH_HOURS_ASSUMED_8");
  }

  // Manual-review conditions (no automatic figure produced).
  const manual = [];
  if (vesselType === "MOU" && !["DP", "DP_AND_OFFSHORE"].includes(dpo)) manual.push("MOU_NOT_UNDERWAY_OR_DP");
  if (vesselType === "BARGE" && DECK_CAPACITIES.includes(capacity)) manual.push("NON_PROPELLED_VESSEL_DECK");
  if (B !== null && !isCadet && hours !== 8 && hours !== 12) manual.push("DAYS_UNDERWAY_WATCH_NOT_8_OR_12");
  if (manual.length) {
    out.conversionStatus = "MANUAL_REVIEW_REQUIRED";
    warnings.push(...manual);
    out.explanationEn = "Manual review required — see warnings (TP 2293 Ch. 3).";
    out.explanationFr = "Examen manuel requis — voir les avertissements (TP 2293, ch. 3).";
    return out;
  }

  if (vesselType === "MOU") { warnings.push("MOU_DP_FULL_RATE"); refs.push("TP 2293 3.20(1)"); }
  if (vesselType === "DREDGER" && DECK_CAPACITIES.includes(capacity)) warnings.push("DREDGER_SELF_PROPELLED_CHECK");
  if (vesselType === "AIR_CUSHION") warnings.push("AIR_CUSHION_MASS_CHECK");

  let credited;
  let ruleId;
  if (B !== null) {
    // R5 — days under way (TP 2293 s. 3.7). Cadets use the 8-hour formula (MPR s. 115(2)).
    const h = isCadet ? 8 : hours;
    if (h === 8) {
      const C = 1.5 * B;
      credited = Math.min(C, A);
      ruleId = "TP2293-3.7(1)(a)";
      steps.push({
        en: `8-h watch, ${B} days under way × 1.5 = ${fmt(C, "en")}; limited to ${A} days on board`,
        fr: `quart de 8 h, ${B} jours en route × 1,5 = ${fmt(C, "fr")}; limité à ${A} jours à bord`
      });
    } else {
      const D = 1.5 * A, E = 2.25 * B;
      credited = Math.min(D, E);
      ruleId = "TP2293-3.7(1)(b)";
      steps.push({
        en: `12-h watch, lesser of ${A} days on board × 1.5 = ${fmt(D, "en")} and ${B} days under way × 2.25 = ${fmt(E, "en")}`,
        fr: `quart de 12 h, le moindre de ${A} jours à bord × 1,5 = ${fmt(D, "fr")} et ${B} jours en route × 2,25 = ${fmt(E, "fr")}`
      });
    }
    out.sourceType = "DAYS_AT_SEA";
    out.sourceDays = B;
    refs.push("TP 2293 3.7", "MPR 116");
    warnings.push("DAYS_UNDERWAY_METHOD_CONFIRM");
  } else if (isCadet) {
    // R4
    credited = A;
    ruleId = "MPR-115(2)-CADET";
    steps.push({ en: `cadet: ${A} days on board × 1`, fr: `élève-officier : ${A} jours à bord × 1` });
    out.sourceType = "DAYS_ON_BOARD";
    out.sourceDays = A;
    refs.push("MPR 115(2)");
  } else {
    // R2 / R3
    const factor = Math.min(hours, 12) / 8;
    credited = A * factor;
    ruleId = hours === 8 ? "MPR-115(1)" : "MPR-115(2)/TP2293-3.5";
    steps.push({
      en: `${A} days on board × ${fmt(factor, "en")} (${Math.min(hours, 12)}-h watch ÷ 8 h)`,
      fr: `${A} jours à bord × ${fmt(factor, "fr")} (quart de ${Math.min(hours, 12)} h ÷ 8 h)`
    });
    if (hours > 12) warnings.push("WATCH_HOURS_CAPPED_12");
    out.sourceType = "DAYS_ON_BOARD";
    out.sourceDays = A;
    refs.push(hours === 8 ? "MPR 115(1)" : "MPR 115(2)", ...(hours > 8 ? ["TP 2293 3.5(1)"] : []));
  }

  if (!isCadet && hours > 8) warnings.push("ATTESTATION_REQUIRED_OVER_8H");

  // R6 — junior officer to the officer in charge of the watch.
  if (JUNIOR_OFFICER_CAPACITIES.includes(capacity)) {
    const before = credited;
    credited = credited * 2 / 3;
    ruleId += "+MPR-117";
    steps.push({ en: `junior officer: ${fmt(before, "en")} × 2/3`, fr: `officier subalterne : ${fmt(before, "fr")} × 2/3` });
    refs.push("MPR 117");
    warnings.push("JUNIOR_OFFICER_9_MONTH_LIMIT");
  }

  out.convertedDaysExact = round2(credited);
  out.convertedDays = Math.floor(credited + 1e-9);
  out.conversionRate = out.sourceDays ? round2(credited / out.sourceDays) : null;
  out.conversionStatus = "CALCULATED";
  out.calculationRuleId = ruleId;
  out.legalReference.section = refs.join("; ");
  out.explanationEn = `${steps.map((s) => s.en).join("; ")} = ${fmt(credited, "en")} → ${out.convertedDays} days credited (${refs.join("; ")}).`;
  out.explanationFr = `${steps.map((s) => s.fr).join("; ")} = ${fmt(credited, "fr")} → ${out.convertedDays} jours crédités (${refs.join("; ")}).`;
  return out;
}

/**
 * R8 — overlapping service (TP 2293 s. 3.3(2)). Sharing one boundary day
 * (discharge from one vessel and engagement on another the same day) is not an overlap.
 * Returns [{a, b, days}] using 0-based line indexes.
 */
export function findOverlaps(voyages) {
  const out = [];
  const ranges = voyages.map((v, i) => ({ i, s: parseDate(v.dates.embarkationDate), e: parseDate(v.dates.disembarkationDate) }))
    .filter((r) => r.s !== null && r.e !== null && r.e >= r.s);
  for (let x = 0; x < ranges.length; x++) {
    for (let y = x + 1; y < ranges.length; y++) {
      const a = ranges[x], b = ranges[y];
      const days = Math.round((Math.min(a.e, b.e) - Math.max(a.s, b.s)) / DAY_MS);
      if (days > 0) out.push({ a: a.i, b: b.i, days });
    }
  }
  return out;
}

/** Apply conversion to every line, add overlap warnings. Mutates and returns voyages. */
export function convertAll(voyages) {
  voyages.forEach((v) => { v.calculation = { ...v.calculation, ...convertVoyage(v) }; v.calculation.overlaps = []; });
  for (const o of findOverlaps(voyages)) {
    for (const [self, other] of [[o.a, o.b], [o.b, o.a]]) {
      const c = voyages[self].calculation;
      c.overlaps.push({ line: other + 1, days: o.days });
      if (!c.warnings.includes("OVERLAPPING_SERVICE")) c.warnings.push("OVERLAPPING_SERVICE");
    }
  }
  return voyages;
}

/** R6 cap and R7 months, for the summary. */
export function totals(voyages) {
  let total = 0, calculated = 0, manual = 0, notCalculated = 0, junior = 0;
  for (const v of voyages) {
    const c = v.calculation;
    if (c.conversionStatus === "CALCULATED" && c.convertedDays !== null) {
      calculated += 1;
      total += c.convertedDays;
      if (JUNIOR_OFFICER_CAPACITIES.includes(v.service.capacityCode)) junior += c.convertedDays;
    } else if (c.conversionStatus === "MANUAL_REVIEW_REQUIRED") manual += 1;
    else notCalculated += 1;
  }
  const juniorExcess = Math.max(0, junior - JUNIOR_OFFICER_MAX_DAYS);
  total -= juniorExcess;
  const overlapDays = findOverlaps(voyages).reduce((s, o) => s + o.days, 0);
  return {
    totalConvertedDays: calculated ? total : null,
    totalConvertedMonths: calculated ? Math.floor((total / 30) * 100) / 100 : null,
    recordsCalculated: calculated, recordsRequiringManualReview: manual, recordsNotCalculated: notCalculated,
    juniorOfficerDays: junior, juniorOfficerExcessDays: juniorExcess, overlapDays
  };
}
