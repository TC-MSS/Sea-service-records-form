/**
 * Record rules — v0.9.0 (shared by the production and development pages).
 *
 *  - Certificate department and acronym (file names).
 *  - Mandatory service-record fields before Export JSON / Export PDF, by department
 *    of the certificate sought (EXN 2):
 *      deck:   A capacity, B vessel, C official number, D vessel type, G gross tonnage,
 *              H class of voyage, I port of registry, J watch, P engagement, Q discharge, S days at sea
 *      engine: same, but E main engine power (kW) instead of G gross tonnage and H class of voyage.
 *  - Export file names:
 *      CDN - LAST NAME - UNVETTED|VETTED QUALIFYING SEA SERVICE - <ACRONYM> - TOTAL OF X DAYS FROM <date> TO <date>
 */

/** Certificate code → [department, acronym]. */
export const CERTIFICATE_INFO = Object.freeze({
  MASTER_MARINER: ["DECK", "MM"], MASTER_NC: ["DECK", "MNC"],
  MASTER_3000_NC: ["DECK", "M3000NC"], MASTER_500_NC: ["DECK", "M500NC"],
  MASTER_3000_DOM: ["DECK", "M3000D"], MASTER_500_DOM: ["DECK", "M500D"], MASTER_150_DOM: ["DECK", "M150D"],
  MASTER_LIMITED: ["DECK", "ML"], CHIEF_MATE: ["DECK", "CM"], CHIEF_MATE_NC: ["DECK", "CMNC"],
  WATCHKEEPING_MATE: ["DECK", "WKM"], WATCHKEEPING_MATE_NC: ["DECK", "WKMNC"],
  FISHING_1: ["DECK", "FM1"], FISHING_2: ["DECK", "FM2"], FISHING_3: ["DECK", "FM3"], FISHING_4: ["DECK", "FM4"],
  ABLE_SEAFARER: ["DECK", "AS"], BRIDGE_WATCH_RATING: ["DECK", "BWR"],
  ENGINEER_1_MOTOR: ["ENGINE", "1EM"], ENGINEER_1_STEAM: ["ENGINE", "1ES"],
  ENGINEER_2_MOTOR: ["ENGINE", "2EM"], ENGINEER_2_STEAM: ["ENGINE", "2ES"],
  ENGINEER_3_MOTOR: ["ENGINE", "3EM"], ENGINEER_3_STEAM: ["ENGINE", "3ES"],
  ENGINEER_4_MOTOR: ["ENGINE", "4EM"], ENGINEER_4_STEAM: ["ENGINE", "4ES"],
  WK_ENGINEER_FISHING: ["ENGINE", "WKEF"], SVMO: ["ENGINE", "SVMO"], ENGINE_ROOM_RATING: ["ENGINE", "ERR"]
});

export const certificateDepartment = (code) => CERTIFICATE_INFO[code]?.[0] || null;
export const certificateAcronym = (code) => CERTIFICATE_INFO[code]?.[1] || "";

/** Column letter → path in a v0.5.0 voyage. */
export const FIELD_PATHS = Object.freeze({
  A: "service.capacityCode", B: "vessel.vesselName", C: "vessel.identifierNumber", D: "vessel.vesselTypeCode",
  E: "vessel.propulsionPowerKw", G: "vessel.grossTonnage", H: "vessel.voyageClassification",
  I: "vessel.portOrCountryOfRegistry", J: "service.watchHours", P: "dates.embarkationDate",
  Q: "dates.disembarkationDate", S: "dates.daysAtSeaEntered"
});

export const MANDATORY_COLUMNS = Object.freeze({
  DECK: ["A", "B", "C", "D", "G", "H", "I", "J", "P", "Q", "S"],
  ENGINE: ["A", "B", "C", "D", "E", "I", "J", "P", "Q", "S"]
});

const get = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
const empty = (v) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

/**
 * Everything that prevents a candidate export, as codes the UI translates:
 * { header: [codes], lines: [{ line, missing: [column letters], errors: [codes] }], ok }
 *  - header: CERTIFICATE_REQUIRED, SURNAME_REQUIRED, CDN_REQUIRED (needed for the file name),
 *            DECLARATION_REQUIRED, NO_SERVICE_LINES
 *  - per line: missing mandatory columns; ICE_DAYS_EXCEED_ONBOARD (ice days are optional,
 *              but a figure above the days on board must be corrected first).
 */
export function candidateExportCheck(record) {
  const header = [];
  const cert = record.application?.certificateAppliedFor?.code || "";
  const dept = certificateDepartment(cert);
  if (!cert) header.push("CERTIFICATE_REQUIRED");
  if (empty(record.candidate?.surname)) header.push("SURNAME_REQUIRED");
  if (empty(record.candidate?.cdnNumber)) header.push("CDN_REQUIRED");
  if (!record.candidate?.declarationAccepted) header.push("DECLARATION_REQUIRED");
  if (!record.voyages?.length) header.push("NO_SERVICE_LINES");
  const columns = MANDATORY_COLUMNS[dept] || MANDATORY_COLUMNS.DECK;
  const lines = (record.voyages || []).map((v, i) => {
    const missing = columns.filter((c) => empty(get(v, FIELD_PATHS[c])));
    const errors = iceExceedCodes(v);
    return { line: i + 1, missing, errors };
  }).filter((l) => l.missing.length || l.errors.length);
  return { ok: !header.length && !lines.length, header, lines, department: dept || "DECK", columns };
}

/** Ice condition codes whose days exceed the line's days on board. */
export function iceExceeding(v) {
  const onBoard = v.dates?.daysOnBoard;
  const c = v.specializedService?.iceConditions || {};
  if (onBoard === null || onBoard === undefined) return [];
  return ["POLAR", "ACCEPTABLE_ICE"].filter((code) => c[code]?.selected && c[code].days !== null && c[code].days !== undefined && Number(c[code].days) > onBoard);
}
const iceExceedCodes = (v) => (iceExceeding(v).length ? ["ICE_DAYS_EXCEED_ONBOARD"] : []);

/** Earliest engagement and latest discharge on the record (YYYY-MM-DD), or null. */
export function serviceDateRange(record) {
  const starts = (record.voyages || []).map((v) => v.dates?.embarkationDate).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "")).sort();
  const ends = (record.voyages || []).map((v) => v.dates?.disembarkationDate).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "")).sort();
  return { from: starts[0] || null, to: ends[ends.length - 1] || null };
}

const clean = (s) => String(s ?? "").normalize("NFC").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * v0.9.0 file name (without extension).
 * @param {"UNVETTED"|"VETTED"} kind  candidate export = UNVETTED, examiner export = VETTED
 * @param {number|null} totalDays     candidate: total converted days; examiner: total final accepted days
 */
export function exportFileName(record, kind, totalDays) {
  const { from, to } = serviceDateRange(record);
  const parts = [
    clean(record.candidate?.cdnNumber) || "NO CDN",
    clean(record.candidate?.surname).toLocaleUpperCase("fr-CA") || "NO NAME",
    `${kind} QUALIFYING SEA SERVICE`,
    certificateAcronym(record.application?.certificateAppliedFor?.code) || "NO CERTIFICATE",
    `TOTAL OF ${totalDays ?? 0} DAYS FROM ${from || "NO DATE"} TO ${to || "NO DATE"}`
  ];
  return parts.join(" - ");
}

/** Today's local date as YYYY-MM-DD. */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
