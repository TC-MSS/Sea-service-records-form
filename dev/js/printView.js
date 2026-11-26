/**
 * Print / PDF view — v0.8.0 (shared by the production and development pages).
 *
 * "Export PDF / Print" builds a clean, read-only copy of the record in #printView
 * and opens the browser's print window; the user chooses "Save as PDF" to create
 * the file. No PDF library is needed and nothing leaves the browser.
 */
import { t } from "./examinerI18n.js";
import { CAPACITIES, VESSEL_TYPES, CERTIFICATES, PROPULSION, VOYAGE_CLASSES, labelFor } from "./referenceData.js";
import { ENUMS } from "./dataModel.js";

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dash = (v) => (v === null || v === undefined || v === "" ? "—" : esc(v));
const strip = (html) => String(html).replace(/<br>/g, " ");
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const num = (n, lang) => (lang === "fr" ? String(n).replace(".", ",") : String(n));

/** Column K text: each selected ice condition with its days, e.g. "Polar waters: 12 d". */
export function iceText(v, lang) {
  const c = v.specializedService?.iceConditions || {};
  return ENUMS.iceConditions.filter((code) => c[code]?.selected)
    .map((code) => `${t(lang, code)}: ${c[code].days === null || c[code].days === undefined ? "?" : t(lang, "iceDaysShort", { n: c[code].days })}`);
}

/** Columns K–O as a list of short texts. */
export function specializedParts(v, lang) {
  const s = v.specializedService;
  const parts = [...iceText(v, lang)];
  if (s.passengerService) parts.push(t(lang, "passengerService"));
  if (s.transferOperation && s.transferOperation !== "NONE") parts.push(t(lang, s.transferOperation));
  if (s.fishingService) parts.push(t(lang, "fishingService"));
  if (s.dpOffshoreService && s.dpOffshoreService !== "NONE") parts.push(t(lang, s.dpOffshoreService));
  return parts;
}

export function convertedText(v, lang) {
  const c = v.calculation;
  if (c.conversionStatus === "CALCULATED" && c.convertedDays !== null) return String(c.convertedDays);
  return t(lang, c.conversionStatus === "MANUAL_REVIEW_REQUIRED" ? "manualReview" : c.conversionStatus === "CALCULATION_ERROR" ? "calculationError" : "notCalculated");
}

function header(record, lang, title, unvetted) {
  const c = record.candidate, a = record.application;
  const info = [
    ["surname", c.surname], ["givenNames", c.givenNames], ["cdnNumber", c.cdnNumber], ["applicationDate", a.applicationDate],
    ["certificateApplied", labelFor(CERTIFICATES, a.certificateAppliedFor?.code, lang)],
    ["certificateHeld", labelFor(CERTIFICATES, a.certificateHeld?.code, lang) || t(lang, "noCertificate")]
  ];
  return `<h1>${esc(title)}</h1>
    ${unvetted ? `<p class="pvUnvetted">${esc(t(lang, "unvettedTitle"))}<br><span>${esc(t(lang, "unvettedTitleOther"))}</span></p>` : ""}
    <p class="pvMeta">${esc(t(lang, "printedOn", { d: localDate() }))}</p>
    <table class="pvInfo"><tbody>${info.map(([k, v]) => `<tr><th>${esc(t(lang, k))}</th><td>${dash(v)}</td></tr>`).join("")}</tbody></table>`;
}

function serviceTable(record, lang, convertedHeaderKey) {
  const heads = ["line", "capacity", "vessel", "officialImo", "vesselType", "kw", "propulsion", "gt", "voyage", "registry", "watch", "specialized", "embark", "disembark", "daysOnBoard", "daysAtSea", convertedHeaderKey];
  const rows = record.voyages.map((v, i) => {
    const ve = v.vessel, d = v.dates;
    return `<tr>
      <td>${i + 1}</td><td>${dash(labelFor(CAPACITIES, v.service.capacityCode, lang))}</td><td>${dash(ve.vesselName)}</td>
      <td>${ve.identifierNumber ? `${ve.identifierType === "IMO" ? "IMO " : ""}${esc(ve.identifierNumber)}` : "—"}</td>
      <td>${dash(labelFor(VESSEL_TYPES, ve.vesselTypeCode, lang))}</td><td class="n">${dash(ve.propulsionPowerKw)}</td>
      <td>${dash(labelFor(PROPULSION, ve.propulsionType, lang))}</td><td class="n">${dash(ve.grossTonnage)}</td>
      <td>${dash(labelFor(VOYAGE_CLASSES, ve.voyageClassification, lang))}</td><td>${dash(ve.portOrCountryOfRegistry)}</td>
      <td class="n">${dash(v.service.watchHours)}</td><td>${specializedParts(v, lang).map(esc).join("<br>") || esc(t(lang, "none"))}</td>
      <td>${dash(d.embarkationDate)}</td><td>${dash(d.disembarkationDate)}</td><td class="n">${dash(d.daysOnBoard)}</td>
      <td class="n">${d.daysAtSeaDifferent ? dash(d.daysAtSeaEntered) : ""}</td><td class="n"><strong>${esc(convertedText(v, lang))}</strong></td></tr>`;
  }).join("");
  return `<table class="pvTable"><thead><tr>${heads.map((h) => `<th>${esc(strip(t(lang, h)))}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}

function explanations(record, lang) {
  return `<h2>${esc(t(lang, "explanationsTitle"))}</h2><ol class="pvExplain">${record.voyages.map((v) =>
    `<li>${esc(lang === "fr" ? v.calculation.explanationFr : v.calculation.explanationEn)}</li>`).join("")}</ol>`;
}

function conversionSummary(s, lang) {
  const ac = s.automatedCalculation;
  const total = ac.totalConvertedDays === null ? t(lang, "notCalculated") : `${ac.totalConvertedDays} (${num(ac.totalConvertedMonths, lang)} ${t(lang, "months")})`;
  return [
    ["totalDaysOnBoard", s.candidateClaim.totalDaysOnBoard], ["totalDaysAtSea", s.candidateClaim.totalDaysAtSea],
    ["totalConvertedDays", total], ["linesManualReview", ac.recordsRequiringManualReview], ["linesNotCalculated", ac.recordsNotCalculated],
    ["overlapDays", ac.overlapDays], ["juniorExcess", ac.juniorOfficerExcessDays],
    ["polarDays", s.specializedService.polarDays], ["acceptableIceDays", s.specializedService.acceptableIceDays],
    ["rulesVersion", ac.rulesVersion]
  ];
}

const kvTable = (rows, lang) => `<table class="pvInfo"><tbody>${rows.map(([k, v]) => `<tr><th>${esc(t(lang, k))}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>`;

/** Candidate copy (production and development candidate pages). */
export function candidatePrintHtml(record, summary, lang, title) {
  return `${header(record, lang, title, true)}
    <h2>${esc(t(lang, "seaServiceRecords"))}</h2>${serviceTable(record, lang, "convertedDaysUnvetted")}
    ${explanations(record, lang)}
    <h2>${esc(t(lang, "candidateSummary"))} — ${esc(t(lang, "unvettedTitle"))}</h2>${kvTable(conversionSummary(summary, lang), lang)}
    <p class="pvNote">${esc(t(lang, "calcNote"))}</p>
    <p class="pvNote">${esc(t(lang, "unvettedNote"))}</p>
    <h2>${esc(t(lang, "applicantDeclarationTitle"))}</h2>
    <p>${record.candidate.declarationAccepted ? "☒" : "☐"} ${esc(t(lang, "declaration"))}${record.candidate.declarationDate ? ` (${esc(record.candidate.declarationDate)})` : ""}</p>`;
}

/** Examiner copy (dev/examiner.html) — v0.8.0 layout. */
export function examinerPrintHtml(record, summary, lang) {
  const reviews = record.voyages.map((v, i) => {
    const r = v.examinerReview;
    const checks = ["vesselVerified", "capacityVerified", "datesVerified", "specializedServiceVerified", "supportingDocumentsVerified"]
      .map((k) => `${r[k] ? "☒" : "☐"} ${esc(t(lang, k))}`).join(" &nbsp; ");
    const status = r.reviewStatus === "NOT_REVIEWED" ? "—" : t(lang, r.reviewStatus);
    return `<tr><td>${i + 1}</td><td>${esc(status)}</td>
      <td class="n">${r.referenceDays === null ? esc(t(lang, "notCalculated")) : esc(r.referenceDays)}</td><td class="n">${dash(r.finalAcceptedDays)}</td><td class="n"><strong>${esc(r.effectiveAcceptedDays)}</strong></td>
      <td>${dash(r.adjustmentReason)}</td><td>${dash(r.examinerComments)}</td></tr>
      <tr class="pvChecks"><td></td><td colspan="6">${checks}</td></tr>`;
  }).join("");
  const e = summary.examinerDetermination;
  const diff = e.differenceFromConverted === null ? "—" : (e.differenceFromConverted > 0 ? `+${e.differenceFromConverted}` : String(e.differenceFromConverted));
  const heads = ["line", "reviewStatus", "referenceDaysConverted", "finalAcceptedDays", "countedDays", "adjustmentReason", "examinerComments"];
  const cert = labelFor(CERTIFICATES, record.application.certificateAppliedFor?.code, lang) || "—";
  const services = Object.entries(e.specialServiceApprovedDays || {});
  return `${header(record, lang, t(lang, "examinerPrintTitle"), false)}
    <h2>${esc(t(lang, "seaServiceRecords"))}</h2>${serviceTable(record, lang, "convertedDays")}
    ${explanations(record, lang)}
    <h2>${esc(t(lang, "examinerReviewPrint"))}</h2>
    <table class="pvTable"><thead><tr>${heads.map((h) => `<th>${esc(t(lang, h))}</th>`).join("")}</tr></thead><tbody>${reviews}</tbody></table>
    <h2>${esc(t(lang, "summary"))}</h2>
    ${kvTable(conversionSummary(summary, lang), lang)}
    <h2>${esc(t(lang, "examinerDetermination"))}</h2>
    <p class="pvTotal"><strong>${esc(t(lang, "totalFinalAcceptedDays"))}: ${esc(e.totalFinalAcceptedDays)} (${esc(num(e.totalFinalAcceptedMonths, lang))} ${esc(t(lang, "months"))})</strong><br>
      ${esc(t(lang, "certificateForTotal"))}: <strong>${esc(cert)}</strong></p>
    ${kvTable([["differenceFromConverted", diff], ["recordsRequiringInformation", e.recordsRequiringInformation]], lang)}
    <h3>${esc(t(lang, "specialServiceApproved"))}</h3>
    ${services.length ? kvTable(services.map(([code, days]) => [code, days]), lang) : `<p>${esc(t(lang, "noSpecialService"))}</p>`}
    <p class="pvNote">${esc(t(lang, "summaryNote"))}</p>
    <h2>${esc(t(lang, "generalAssessment"))}</h2>
    <p><strong>${esc(t(lang, "examinerName"))}:</strong> ${dash(record.examinerAssessment.examiner.examinerName)}</p>
    <p>${dash(record.examinerAssessment.generalComments)}</p>`;
}

/** v0.8.0 — shown instead of the candidate copy when the declaration is not ticked. */
export function declarationMissingPrintHtml(lang) {
  return `<p class="pvCaution">${esc(t(lang, "declarationRequiredPrint"))}</p>`;
}

/**
 * Fill #printView, suggest a file name through the document title, open the print window.
 * The page's normal content is hidden by the print stylesheet while #printView is shown.
 */
export function printRecord(html, fileName) {
  const target = document.getElementById("printView");
  target.innerHTML = html;
  const previousTitle = document.title;
  document.title = fileName;
  const restore = () => { document.title = previousTitle; window.removeEventListener("afterprint", restore); };
  window.addEventListener("afterprint", restore);
  window.print();
  setTimeout(restore, 1000); // some browsers do not fire afterprint
}

export function fileStem(record) {
  const id = String(record.candidate?.cdnNumber || record.recordId || "record").replace(/[^\w-]+/g, "_");
  return `SeaServiceRecord-${id}-${localDate()}`;
}
