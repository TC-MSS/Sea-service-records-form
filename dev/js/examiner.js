/**
 * Examiner review page controller — v0.8.0 development build.
 *
 * v0.8.0: examiner basis removed; Final accepted days enabled only for "Accepted with adjustment"
 * and "Additional information required"; "Not reviewed" is only the starting state;
 * summary reduced to the total (bold, with the certificate applied for), the difference,
 * "Additional information required" and the approved days per special service.
 *
 * Earlier notes:
 *
 * v0.7.0:
 *  - "Schema / record" is no longer displayed (schemaVersion and recordId stay in the saved/exported JSON).
 *  - Adjustment reason: neutral "(required)" indicator when a reason is needed; red only while it is empty.
 *  - Final accepted days override everything; the basis is optional (reference = converted days by default);
 *    a missing reason is a warning, never a block; final days on a "Not reviewed" line set the status.
 *  - Export PDF / Print builds a read-only copy (printView.js).
 */
import { TEXT, t } from "./examinerI18n.js";
import { CAPACITIES, VESSEL_TYPES, CERTIFICATES, PROPULSION, VOYAGE_CLASSES, labelFor } from "./referenceData.js";
import { applyExaminerReview, EXAMINER_INPUT_FIELDS } from "./examinerReview.js";
import { validateVoyage, reasonNeeded, reasonMissing } from "./validationEngine.js";
import { specializedParts, examinerPrintHtml, printRecord, fileStem } from "./printView.js";
import { buildSummary } from "./summaryEngine.js";
import { toNumberOrNull, recalculateVoyages, finalDaysEnabled } from "./calculationEngine.js";
import { RULES_VERSION } from "./tp2293Engine.js";
import * as storage from "./storageEngine.js";

const $ = (id) => document.getElementById(id);
let language = "en";
let record = null;
let lastStatus = { key: "noRecord", vars: {}, kind: "" };

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const show = (v) => (v === null || v === undefined || v === "" ? "—" : esc(v));

function setStatus(key, vars = {}, kind = "status-success") {
  lastStatus = { key, vars, kind };
  const panel = $("statusPanel");
  panel.className = kind;
  panel.textContent = t(language, key, vars);
}

function applyStaticText(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key === "noRecord" && el.id === "statusPanel") return; // handled by setStatus
    if (TEXT[language][key] !== undefined) el.innerHTML = TEXT[language][key];
  });
}

function specializedText(v) {
  const parts = specializedParts(v, language);
  return parts.length ? parts.map(esc).join("<br>") : t(language, "none");
}

function convertedCell(v, lang) {
  const c = v.calculation;
  const title = esc(lang === "fr" ? c.explanationFr : c.explanationEn);
  if (c.conversionStatus === "CALCULATED" && c.convertedDays !== null) return `<span class="converted" title="${title}">${esc(c.convertedDays)}</span>`;
  const key = c.conversionStatus === "MANUAL_REVIEW_REQUIRED" ? "manualReview" : c.conversionStatus === "CALCULATION_ERROR" ? "calculationError" : "notCalculated";
  return `<span class="notCalculated" title="${title}">${esc(t(lang, key))}</span>`;
}
const convertedText = (v) => convertedCell(v, language);

function voyageRowHtml(v, i) {
  const d = v.dates;
  const ve = v.vessel;
  return `
    <td class="num">${i + 1}</td>
    <td>${show(labelFor(CAPACITIES, v.service.capacityCode, language))}</td>
    <td>${show(ve.vesselName)}</td>
    <td>${ve.identifierNumber ? `${ve.identifierType === "IMO" ? "IMO " : ""}${esc(ve.identifierNumber)}` : "—"}</td>
    <td>${show(labelFor(VESSEL_TYPES, ve.vesselTypeCode, language))}</td>
    <td class="num">${show(ve.propulsionPowerKw)}</td>
    <td>${show(labelFor(PROPULSION, ve.propulsionType, language))}</td>
    <td class="num">${show(ve.grossTonnage)}</td>
    <td>${show(labelFor(VOYAGE_CLASSES, ve.voyageClassification, language))}</td>
    <td>${show(ve.portOrCountryOfRegistry)}</td>
    <td class="num">${show(v.service.watchHours)}</td>
    <td class="specialized">${specializedText(v)}</td>
    <td>${show(d.embarkationDate)}</td>
    <td>${show(d.disembarkationDate)}</td>
    <td class="num" data-col="daysOnBoard">${show(d.daysOnBoard)}</td>
    <td class="num" data-col="daysAtSea">${d.daysAtSeaDifferent ? show(d.daysAtSeaEntered) : ""}</td>
    <td class="num" data-col="convertedDays">${convertedText(v)}</td>`;
}

function readPanel(panel) {
  const input = {};
  panel.querySelectorAll("[data-field]").forEach((el) => {
    const f = el.dataset.field;
    if (el.type === "checkbox") input[f] = el.checked;
    else if (f === "finalAcceptedDays") input[f] = toNumberOrNull(el.value);
    else input[f] = el.value;
  });
  return input;
}

function writePanel(panel, review) {
  panel.querySelectorAll("[data-field]").forEach((el) => {
    const f = el.dataset.field;
    if (el.type === "checkbox") el.checked = Boolean(review[f]);
    else el.value = review[f] ?? "";
  });
}

function refreshLine(index) {
  const v = record.voyages[index];
  const panel = document.querySelector(`.reviewRow[data-index="${index}"] .reviewPanel`);
  if (!panel) return { errors: [], warnings: [] };
  const result = applyExaminerReview(v, readPanel(panel), $("examinerName").value || null);
  const voyageResult = validateVoyage(v);
  const r = v.examinerReview;
  // v0.8.0 — Final accepted days only for "Accepted with adjustment" / "Additional information required".
  const finalInput = panel.querySelector("[data-field=finalAcceptedDays]");
  const enabled = finalDaysEnabled(r.reviewStatus);
  finalInput.disabled = !enabled;
  if (!enabled) finalInput.value = "";
  finalInput.placeholder = r.reviewStatus === "ACCEPTED" && r.referenceDays !== null ? String(r.referenceDays) : "";
  finalInput.title = r.reviewStatus === "ACCEPTED" ? t(language, "finalDaysHintAccepted") : "";

  panel.querySelector(".calcText").textContent = language === "fr" ? v.calculation.explanationFr : v.calculation.explanationEn;
  panel.querySelector(".basisDays").textContent = r.referenceDays === null ? t(language, "notCalculated") : String(r.referenceDays);
  panel.querySelector(".countedDays").textContent = String(r.effectiveAcceptedDays ?? 0);

  // Neutral "(required)" indicator when a reason is needed; red only while the reason is empty.
  const needed = reasonNeeded(v);
  const missing = reasonMissing(v);
  const label = panel.querySelector(".adjustmentLabel");
  label.classList.toggle("needed", needed);
  label.classList.toggle("missing", missing);
  label.classList.remove("required");
  const textarea = label.querySelector("textarea");
  textarea.required = needed;
  textarea.setAttribute("aria-invalid", String(missing));

  const errors = [...voyageResult.errors, ...result.errors];
  const warnings = [...voyageResult.warnings, ...result.warnings];
  const warnClass = (c) => (c === "ADJUSTMENT_REASON_REQUIRED" ? "warning reasonMissing" : c === "STATUS_SET_AUTOMATICALLY" ? "warning info" : "warning");
  panel.querySelector(".messages").innerHTML =
    errors.map((c) => `<li class="error" data-code="${c}">${esc(t(language, c))}</li>`).join("") +
    warnings.map((c) => `<li class="${warnClass(c)}" data-code="${c}">${esc(t(language, c))}</li>`).join("");
  panel.classList.toggle("hasErrors", errors.length > 0);
  return { errors, warnings };
}

function refreshSummary() {
  if (!record) return;
  let linesWithErrors = 0;
  record.voyages.forEach((_, i) => { if (refreshLineState(i)) linesWithErrors += 1; });
  const s = buildSummary(record.voyages);
  record.calculationSummary = s;
  record.examinerAssessment.totalFinalAcceptedDays = s.examinerDetermination.totalFinalAcceptedDays;
  $("sumDaysOnBoard").textContent = s.candidateClaim.totalDaysOnBoard;
  $("sumDaysAtSea").textContent = s.candidateClaim.totalDaysAtSea;
  $("sumPolarDays").textContent = s.specializedService.polarDays;
  $("sumIceDays").textContent = s.specializedService.acceptableIceDays;
  const ac = s.automatedCalculation;
  $("sumConvertedDays").textContent = ac.totalConvertedDays === null ? t(language, "notCalculated") : ac.totalConvertedDays;
  $("sumConvertedMonths").textContent = ac.totalConvertedMonths === null ? "" : `(${monthsText(ac.totalConvertedMonths)})`;
  $("sumManual").textContent = ac.recordsRequiringManualReview;
  $("sumNotCalculated").textContent = ac.recordsNotCalculated;
  $("sumOverlap").textContent = ac.overlapDays;
  $("sumJuniorExcess").textContent = ac.juniorOfficerExcessDays;
  $("sumRules").textContent = ac.rulesVersion || RULES_VERSION;
  $("sumFinalAcceptedDays").textContent = s.examinerDetermination.totalFinalAcceptedDays;
  $("sumFinalAcceptedMonths").textContent = `(${monthsText(s.examinerDetermination.totalFinalAcceptedMonths)})`;
  const diff = s.examinerDetermination.differenceFromConverted;
  const diffEl = $("sumDifference");
  diffEl.textContent = diff === null ? "—" : diff > 0 ? `+${diff}` : String(diff);
  diffEl.className = diff === null || diff === 0 ? "" : diff < 0 ? "diffNeg" : "diffPos";
  $("sumInfo").textContent = s.examinerDetermination.recordsRequiringInformation;
  const cert = record.application.certificateAppliedFor?.code;
  $("sumCertificate").textContent = labelFor(CERTIFICATES, cert, language) || "—";
  const services = Object.entries(s.examinerDetermination.specialServiceApprovedDays || {});
  $("sumSpecialServices").innerHTML = services.length
    ? services.map(([code, days]) => `<li data-service="${code}">${esc(t(language, code))}: <strong>${days}</strong></li>`).join("")
    : `<li>${esc(t(language, "noSpecialService"))}</li>`;
  return linesWithErrors;
}

function monthsText(m) {
  const n = language === "fr" ? String(m).replace(".", ",") : String(m);
  return `${n} ${t(language, "months")}`;
}

const lineErrorState = new Map();
function refreshLineState(i) { return lineErrorState.get(i) === true; }

function onPanelInput(index) {
  const { errors } = refreshLine(index);
  lineErrorState.set(index, errors.length > 0);
  refreshSummary();
}

function render() {
  const tbody = $("recordsBody");
  tbody.innerHTML = "";
  lineErrorState.clear();
  if (!record) { refreshSummary(); return; }

  const c = record.candidate, a = record.application;
  $("infoSurname").textContent = c.surname || "—";
  $("infoGivenNames").textContent = c.givenNames || "—";
  $("infoCdn").textContent = c.cdnNumber || "—";
  $("infoApplicationDate").textContent = a.applicationDate || "—";
  $("infoCertificate").textContent = labelFor(CERTIFICATES, a.certificateAppliedFor.code, language) || "—";
  $("infoCertificateHeld").textContent = labelFor(CERTIFICATES, a.certificateHeld.code, language) || "—";
  $("generalComments").value = record.examinerAssessment.generalComments || "";
  $("examinerName").value = record.examinerAssessment.examiner.examinerName || "";

  const template = $("reviewTemplate");
  record.voyages.forEach((v, i) => {
    const row = document.createElement("tr");
    row.className = "voyageRow";
    row.dataset.index = i;
    row.innerHTML = voyageRowHtml(v, i);
    tbody.appendChild(row);

    const reviewRow = document.createElement("tr");
    reviewRow.className = "reviewRow";
    reviewRow.dataset.index = i;
    const cell = document.createElement("td");
    cell.colSpan = 17;
    const fragment = template.content.cloneNode(true);
    cell.appendChild(fragment);
    reviewRow.appendChild(cell);
    tbody.appendChild(reviewRow);

    const panel = cell.querySelector(".reviewPanel");
    applyStaticText(panel);
    panel.querySelector(".reviewTitle").textContent = t(language, "examinerReview", { n: i + 1 });
    panel.querySelectorAll("[data-field]").forEach((el) => { el.name = `${el.dataset.field}-${i}`; el.id = `${el.dataset.field}-${i}`; });
    writePanel(panel, v.examinerReview);
    panel.addEventListener("input", () => onPanelInput(i));
    panel.addEventListener("change", () => onPanelInput(i));
    const { errors } = refreshLine(i);
    lineErrorState.set(i, errors.length > 0);
  });
  refreshSummary();
}

function loadInto(newRecord, fromLegacy) {
  record = newRecord;
  recalculateVoyages(record.voyages);
  render();
  if (fromLegacy && record.migration) setStatus("loadedLegacy", { from: record.migration.fromSchemaVersion });
  else setStatus("loaded");
}

function collectRecordLevel() {
  if (!record) return;
  record.examinerAssessment.generalComments = $("generalComments").value;
  record.examinerAssessment.examiner.examinerName = $("examinerName").value;
}

function save() {
  if (!record) return setStatus("noRecord", {}, "status-warning");
  collectRecordLevel();
  record.voyages.forEach((_, i) => onPanelInput(i));
  const errorLines = refreshSummary();
  record.auditTrail.push({ at: new Date().toISOString(), action: "EXAMINER_DRAFT_SAVED", by: record.examinerAssessment.examiner.examinerName || null });
  storage.saveRecord(record);
  if (errorLines) setStatus("savedWithErrors", { n: errorLines }, "status-warning");
  else setStatus("saved");
}

function exportJson() {
  if (!record) return setStatus("noRecord", {}, "status-warning");
  collectRecordLevel();
  const blob = new Blob([storage.exportRecord(record)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${fileStem(record)}-examiner.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function fillPrintView() {
  if (!record) { $("printView").innerHTML = ""; return; }
  collectRecordLevel();
  record.voyages.forEach((_, i) => onPanelInput(i));
  $("printView").innerHTML = examinerPrintHtml(record, record.calculationSummary, language);
}

function exportPdf() {
  if (!record) return setStatus("noRecord", {}, "status-warning");
  fillPrintView();
  setStatus("pdfHint");
  printRecord($("printView").innerHTML, `${fileStem(record)}-examiner`);
}

function switchLanguage() {
  language = $("langSelector").value === "fr" ? "fr" : "en";
  document.documentElement.lang = language;
  document.title = t(language, "pageTitle");
  if (record) { record.language = record.language || language; collectRecordLevel(); }
  applyStaticText(document);
  render();
  setStatus(lastStatus.key, lastStatus.vars, lastStatus.kind);
}

document.addEventListener("DOMContentLoaded", () => {
  $("langSelector").addEventListener("change", switchLanguage);
  $("btnLoadCandidate").addEventListener("click", () => {
    const r = storage.loadCandidateRecord();
    r ? loadInto(r, true) : setStatus("notFoundCandidate", {}, "status-warning");
  });
  $("btnLoadDraft").addEventListener("click", () => {
    const r = storage.loadExaminerDraft();
    r ? loadInto(r, false) : setStatus("notFoundDraft", {}, "status-warning");
  });
  $("fileImport").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { loadInto(storage.importRecord(await file.text()), true); }
    catch (err) { console.error(err); setStatus("importError", {}, "status-error"); }
    e.target.value = "";
  });
  $("btnSave").addEventListener("click", save);
  $("btnExport").addEventListener("click", exportJson);
  $("btnPrint").addEventListener("click", exportPdf);
  window.addEventListener("beforeprint", fillPrintView);
  $("generalComments").addEventListener("input", collectRecordLevel);
  $("examinerName").addEventListener("input", collectRecordLevel);
  switchLanguage();
  setStatus("noRecord", {}, "");
});

// Test hook (read-only access for smoke tests and console debugging).
window.__examinerDev = Object.freeze({
  getRecord: () => record,
  fields: EXAMINER_INPUT_FIELDS
});
