/**
 * Special-service vetting — v0.9.0, revised v1.0.0.
 *
 * For Polar waters, Acceptable ice service and the transfer operations (oil / chemical / gas),
 * the examiner reviews each service on each line. Stored per line in
 * examinerReview.serviceReview[code] = { reviewStatus, finalAcceptedDays, adjustmentReason } and recalculated:
 *   automaticDays  days the candidate entered for that service, capped at the line's counted days
 *                  (0 when no days were entered — v1.0.0; transfers no longer use the whole line)
 *   reviewStatus   "" (not chosen) | ACCEPTED | ACCEPTED_WITH_ADJUSTMENT | REJECTED   (v1.0.0)
 *   effectiveDays  ACCEPTED → automatic; ACCEPTED_WITH_ADJUSTMENT → final days (capped at the line's
 *                  counted days; 0 until entered); REJECTED or no status → 0
 *   overLimit      final days above the line's counted days → error (blocks saving and export)
 *   reasonMissing  ACCEPTED_WITH_ADJUSTMENT without a reason → warning
 * Services can be reviewed only when the line has a status that counts days (Accepted, Accepted with
 * adjustment, Additional information required); otherwise every input is cleared and counts 0.
 * A status for every enabled service is required before the examiner exports (not before saving).
 */
export const VETTED_SERVICES = Object.freeze(["POLAR", "ACCEPTABLE_ICE", "OIL_TRANSFER", "CHEMICAL_TRANSFER", "GAS_TRANSFER"]);
export const SERVICE_VETTING_STATUSES = Object.freeze(["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT", "ADDITIONAL_INFORMATION_REQUIRED"]);
export const serviceVettingEnabled = (status) => SERVICE_VETTING_STATUSES.includes(status);

const num = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * Automatic days a line contributes to one special service, or null when the
 * service is not selected on the line.
 */
export function lineAutomaticServiceDays(v, service) {
  const s = v.specializedService || {};
  const approved = Number(v.examinerReview?.effectiveAcceptedDays ?? 0);
  const entered = (conds, code) => {
    const c = conds?.[code];
    if (!c?.selected) return null;
    return Math.min(Number(c.days ?? 0), approved);
  };
  switch (service) {
    case "POLAR": case "ACCEPTABLE_ICE": return entered(s.iceConditions, service);
    case "OIL_TRANSFER": case "CHEMICAL_TRANSFER": case "GAS_TRANSFER":
      if (s.transferConditions) return entered(s.transferConditions, service);
      return s.transferOperation === service ? 0 : null;
    case "PASSENGER": return s.passengerService ? approved : null;
    case "FISHING": return s.fishingService ? approved : null;
    case "DP": return ["DP", "DP_AND_OFFSHORE"].includes(s.dpOffshoreService) ? approved : null;
    case "OFFSHORE": return ["OFFSHORE", "DP_AND_OFFSHORE"].includes(s.dpOffshoreService) ? approved : null;
    default: return null;
  }
}

const SERVICE_STATUSES = ["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT", "REJECTED"];

/**
 * v1.0.0 — a service entry saved by v0.9.0 has no reviewStatus. Keep the examiner's figure:
 * the v0.9.0 figure was the final days if entered, otherwise the v0.9.0 automatic figure
 * (ice: entered days capped; transfer: the whole line). Equal to the new automatic figure → Accepted,
 * otherwise Accepted with adjustment with that figure.
 */
function convertV090Entry(v, code, e, automaticDays, counted) {
  const isTransfer = code.endsWith("_TRANSFER");
  const oldAutomatic = isTransfer ? counted : automaticDays;
  const oldFigure = num(e.finalAcceptedDays) ?? oldAutomatic;
  const accepted = oldFigure === automaticDays;
  v.metadata = v.metadata || {};
  v.metadata.legacyWarnings = v.metadata.legacyWarnings || [];
  if (!v.metadata.legacyWarnings.includes("SERVICE_REVIEW_CONVERTED_V100")) v.metadata.legacyWarnings.push("SERVICE_REVIEW_CONVERTED_V100");
  return {
    reviewStatus: accepted ? "ACCEPTED" : "ACCEPTED_WITH_ADJUSTMENT",
    finalAcceptedDays: accepted ? null : oldFigure,
    adjustmentReason: String(e.adjustmentReason || (accepted ? "" : "Converted from v0.9.0"))
  };
}

/** Refresh examinerReview.serviceReview for one line (call after the line's counted days are known). */
export function updateServiceReview(v) {
  const r = v.examinerReview;
  const old = r.serviceReview && typeof r.serviceReview === "object" ? r.serviceReview : {};
  const next = {};
  const counted = Number(r.effectiveAcceptedDays ?? 0);
  const enabled = serviceVettingEnabled(r.reviewStatus);
  for (const code of VETTED_SERVICES) {
    const automaticDays = lineAutomaticServiceDays(v, code);
    if (automaticDays === null) continue; // service not selected on this line
    let e = old[code] || {};
    if (old[code] && !("reviewStatus" in old[code]) && enabled) e = convertV090Entry(v, code, old[code], automaticDays, counted);
    const reviewStatus = enabled && SERVICE_STATUSES.includes(e.reviewStatus) ? e.reviewStatus : "";
    const adjusting = reviewStatus === "ACCEPTED_WITH_ADJUSTMENT";
    const final = adjusting ? num(e.finalAcceptedDays) : null;
    const invalid = final !== null && (!Number.isInteger(final) || final < 0);
    const overLimit = !invalid && final !== null && final > counted;
    const adjustmentReason = adjusting ? String(e.adjustmentReason ?? "") : "";
    let effectiveDays = 0;
    if (reviewStatus === "ACCEPTED") effectiveDays = automaticDays;
    else if (adjusting && final !== null && !invalid) effectiveDays = Math.min(final, counted);
    next[code] = {
      reviewStatus,
      automaticDays,
      finalAcceptedDays: final,
      adjustmentReason,
      effectiveDays,
      enabled,
      adjusted: Boolean(reviewStatus) && effectiveDays !== automaticDays,
      overLimit,
      invalid,
      reasonMissing: adjusting && !adjustmentReason.trim()
    };
  }
  r.serviceReview = next;
  return v;
}

/** Final days a line contributes to one special service (examiner figure when vetted). */
export function lineFinalServiceDays(v, service) {
  const auto = lineAutomaticServiceDays(v, service);
  if (auto === null) return null;
  const e = v.examinerReview?.serviceReview?.[service];
  return VETTED_SERVICES.includes(service) && e ? e.effectiveDays : auto;
}
