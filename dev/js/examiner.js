/**
 * Examiner review page controller — v0.5.0 development build.
 */
import { TEXT, t } from "./examinerI18n.js";
import { CAPACITIES, VESSEL_TYPES, CERTIFICATES, PROPULSION, VOYAGE_CLASSES, labelFor } from "./referenceData.js";
import { applyExaminerReview, EXAMINER_INPUT_FIELDS } from "./examinerReview.js";
import { validateVoyage } from "./validationEngine.js";
import { buildSummary } from "./summaryEngine.js";
import { toNumberOrNull } from "./calculationEngine.js";
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
  const s = v.specializedService;
  const parts = [];
  if (s.iceService && s.iceService !== "NONE") parts.push(t(language, s.iceService));
  if (s.passengerService) parts.push(t(language, "passengerService"));
  if (s.transferOperation && s.transferOperation !== "NONE") parts.push(t(language, s.transferOperation));
  if (s.fishingService) parts.push(t(language, "fishingService"));
  if (s.dpOffshoreService && s.dpOffshoreService !== "NONE") parts.push(t(language, s.dpOffshoreService));
  return parts.length ? parts.map(esc).join("<br>") : t(language, "none");
}

function convertedText(v) {
  return v.calculation.convertedDays === null || v.calculation.convertedDays === undefined
    ? `<span class="notCalculated">${esc(t(language, "notCalculated"))}</span>`
    : esc(v.calculation.convertedDays);
}

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

  panel.querySelector(".basisDays").textContent =
    r.examinerBasis === "CONVERTED_DAYS" && r.basisDays === null ? t(language, "notCalculated")
      : r.basisDays === null ? "—" : String(r.basisDays);

  const needsReason = r.adjustmentRequired || r.reviewStatus === "ACCEPTED_WITH_ADJUSTMENT";
  const label = panel.querySelector(".adjustmentLabel");
  label.classList.toggle("required", needsReason);
  label.querySelector(".adjustmentText").textContent = t(language, needsReason ? "adjustmentReasonRequired" : "adjustmentReason");
  const textarea = label.querySelector("textarea");
  textarea.required = needsReason;
  textarea.setAttribute("aria-invalid", String(result.errors.includes("ADJUSTMENT_REASON_REQUIRED")));

  const errors = [...voyageResult.errors, ...result.errors];
  const warnings = [...voyageResult.warnings, ...result.warnings];
  panel.querySelector(".messages").innerHTML =
    errors.map((c) => `<li class="error" data-code="${c}">${esc(t(language, c))}</li>`).join("") +
    warnings.map((c) => `<li class="warning" data-code="${c}">${esc(t(language, c))}</li>`).join("");
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
  $("sumConvertedDays").textContent = s.automatedCalculation.totalConvertedDays === null ? t(language, "notCalculated") : s.automatedCalculation.totalConvertedDays;
  $("sumFinalAcceptedDays").textContent = s.examinerDetermination.totalFinalAcceptedDays;
  $("sumReviewed").textContent = s.examinerDetermination.recordsReviewed;
  $("sumNotReviewed").textContent = s.examinerDetermination.recordsNotReviewed;
  $("sumAccepted").textContent = s.examinerDetermination.recordsAccepted;
  $("sumAdjusted").textContent = s.examinerDetermination.recordsAcceptedWithAdjustment;
  $("sumInfo").textContent = s.examinerDetermination.recordsRequiringInformation;
  $("sumRejected").textContent = s.examinerDetermination.recordsRejected;
  $("sumErrors").textContent = linesWithErrors;
  return linesWithErrors;
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
  $("infoSchema").textContent = `${record.schemaVersion} · ${record.recordId}`;
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
  link.download = `SeaServiceRecord-${record.candidate.cdnNumber || record.recordId}-v0.5.0.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
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
  $("btnPrint").addEventListener("click", () => window.print());
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
