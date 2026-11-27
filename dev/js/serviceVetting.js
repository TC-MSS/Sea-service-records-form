/**
 * Special-service vetting — v0.9.0.
 *
 * For Polar waters, Acceptable ice service and the transfer operations (oil / chemical / gas),
 * the examiner can adjust the days approved on each line. Stored per line in
 * examinerReview.serviceReview[code] = { finalAcceptedDays, adjustmentReason } and recalculated:
 *   automaticDays  ice: candidate's days capped at the line's counted days; transfer: the line's counted days
 *   effectiveDays  final days when entered (capped at the line's counted days), otherwise the automatic days
 *   overLimit      final days above the line's counted days → error (blocks saving and export)
 *   adjusted       final days entered and different from the automatic days → reason needed (warning)
 * Final service days can be entered only when the line has a status that counts days
 * (Accepted, Accepted with adjustment, Additional information required); otherwise they are cleared.
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
 * service is not selected on the line (v0.8.0 rule).
 */
export function lineAutomaticServiceDays(v, service) {
  const s = v.specializedService || {};
  const approved = Number(v.examinerReview?.effectiveAcceptedDays ?? 0);
  const ice = (code) => {
    const c = s.iceConditions?.[code];
    if (!c?.selected) return null;
    return Math.min(Number(c.days ?? 0), approved);
  };
  switch (service) {
    case "POLAR": return ice("POLAR");
    case "ACCEPTABLE_ICE": return ice("ACCEPTABLE_ICE");
    case "PASSENGER": return s.passengerService ? approved : null;
    case "OIL_TRANSFER": case "CHEMICAL_TRANSFER": case "GAS_TRANSFER": return s.transferOperation === service ? approved : null;
    case "FISHING": return s.fishingService ? approved : null;
    case "DP": return ["DP", "DP_AND_OFFSHORE"].includes(s.dpOffshoreService) ? approved : null;
    case "OFFSHORE": return ["OFFSHORE", "DP_AND_OFFSHORE"].includes(s.dpOffshoreService) ? approved : null;
    default: return null;
  }
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
    const e = old[code] || {};
    let final = enabled ? num(e.finalAcceptedDays) : null;
    const invalid = final !== null && (!Number.isInteger(final) || final < 0);
    const overLimit = !invalid && final !== null && final > counted;
    const adjusted = final !== null && final !== automaticDays;
    const adjustmentReason = enabled ? String(e.adjustmentReason ?? "") : "";
    next[code] = {
      automaticDays,
      finalAcceptedDays: final,
      adjustmentReason,
      effectiveDays: final === null ? automaticDays : invalid ? 0 : Math.min(final, counted),
      adjusted,
      overLimit,
      invalid,
      reasonMissing: adjusted && !adjustmentReason.trim()
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
