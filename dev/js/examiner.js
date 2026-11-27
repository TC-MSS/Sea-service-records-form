/**
 * Examiner review page controller — v1.0.0 development build.
 *
 * v1.0.0: review status per special service; final accepted days per service displayed; a status for
 * every special service required before export; summary heading "Approved special service".
 *
 *
 * v0.9.0: special-service vetting (ice conditions, transfer operations) per line; summary shows the
 * final figure with the automatic one when adjusted; examiner name, a status and the five verification
 * boxes on every line are required before Export JSON / PDF; over-limit service figures block saving
 * and export; review date shown automatically; file name "… VETTED QUALIFYING SEA SERVICE …".
 *
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
import { specializedParts, examinerPrintHtml, exportBlockedPrintHtml, printRecord } from "./printView.js";
import { exportFileName, todayIso } from "./recordRules.js";
import { serviceVettingEnabled } from "./serviceVetting.js";
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
    <td class="num" data-col="daysAtSea">${show(d.daysAtSeaEntered)}</td>
    <td class="num" data-col="convertedDays">${convertedText(v)}</td>`;
}

const VERIFICATION_FIELDS = ["vesselVerified", "capacityVerified", "datesVerified", "specializedServiceVerified", "supportingDocumentsVerified"];

/**
 * Special-service vetting rows (ice conditions, transfer types) for one line; built once per render.
 * v1.0.0: review status per service (Accepted / Accepted with adjustment / Rejected); adjusted days only
 * with "Accepted with adjustment"; the final accepted days applicable to the service are displayed.
 */
const SERVICE_STATUS_OPTIONS = ["ACCEPTED", "ACCEPTED_WITH_ADJUSTMENT", "REJECTED"];
function serviceVettingHtml(v, i) {
  const codes = Object.keys(v.examinerReview.serviceReview || {});
  if (!codes.length) return "";
  const statusOptions = `<option value="" disabled hidden>${esc(t(language, "selectStatus"))}</option>` +
    SERVICE_STATUS_OPTIONS.map((st) => `<option value="${st}">${esc(t(language, st))}</option>`).join("");
  const rows = codes.map((code) => `<tr data-service="${code}">
      <td>${esc(t(language, code))}</td>
      <td class="num svcAuto"></td>
      <td><select data-sfield="reviewStatus" id="svc-${code}-status-${i}" aria-label="${esc(t(language, code))} — ${esc(t(language, "serviceStatus"))}">${statusOptions}</select></td>
      <td><input type="number" min="0" step="1" inputmode="numeric" data-sfield="finalAcceptedDays" id="svc-${code}-final-${i}" aria-label="${esc(t(language, code))} — ${esc(t(language, "serviceFinalInput"))}"></td>
      <td class="num svcCounted"></td>
      <td><input data-sfield="adjustmentReason" id="svc-${code}-reason-${i}" aria-label="${esc(t(language, code))} — ${esc(t(language, "serviceReason"))}"></td></tr>`).join("");
  return `<fieldset class="serviceVetting"><legend>${esc(t(language, "serviceVetting"))} <span class="reqStar">*</span></legend>
    <table class="svcTable"><thead><tr><th></th><th>${esc(t(language, "serviceAutomatic"))}</th><th>${esc(t(language, "serviceStatus"))}</th><th>${esc(t(language, "serviceFinalInput"))}</th><th>${esc(t(language, "serviceCounted"))}</th><th>${esc(t(language, "serviceReason"))}</th></tr></thead>
    <tbody>${rows}</tbody></table></fieldset>`;
}

function readServiceInputs(panel) {
  const out = {};
  panel.querySelectorAll(".svcTable tr[data-service]").forEach((tr) => {
    out[tr.dataset.service] = {
      reviewStatus: tr.querySelector("[data-sfield=reviewStatus]").value,
      finalAcceptedDays: toNumberOrNull(tr.querySelector("[data-sfield=finalAcceptedDays]").value),
      adjustmentReason: tr.querySelector("[data-sfield=adjustmentReason]").value
    };
  });
  return out;
}

function writeServiceInputs(panel, review) {
  panel.querySelectorAll(".svcTable tr[data-service]").forEach((tr) => {
    const e = review.serviceReview?.[tr.dataset.service] || {};
    tr.querySelector("[data-sfield=reviewStatus]").value = e.reviewStatus || "";
    tr.querySelector("[data-sfield=finalAcceptedDays]").value = e.finalAcceptedDays ?? "";
    tr.querySelector("[data-sfield=adjustmentReason]").value = e.adjustmentReason ?? "";
  });
}

function refreshServiceInputs(panel, v) {
  const r = v.examinerReview;
  const enabled = serviceVettingEnabled(r.reviewStatus);
  panel.querySelectorAll(".svcTable tr[data-service]").forEach((tr) => {
    const e = r.serviceReview?.[tr.dataset.service];
    tr.querySelector(".svcAuto").textContent = e ? String(e.automaticDays) : "—";
    tr.querySelector(".svcCounted").textContent = e ? String(e.effectiveDays) : "0";
    const status = tr.querySelector("[data-sfield=reviewStatus]");
    const final = tr.querySelector("[data-sfield=finalAcceptedDays]");
    const reason = tr.querySelector("[data-sfield=adjustmentReason]");
    status.disabled = !enabled;
    if (!enabled) status.value = "";
    const adjusting = enabled && status.value === "ACCEPTED_WITH_ADJUSTMENT";
    for (const el of [final, reason]) { el.disabled = !adjusting; if (!adjusting) el.value = ""; }
    final.placeholder = e ? String(e.automaticDays) : "";
    final.classList.toggle("svcOverLimit", Boolean(e?.overLimit || e?.invalid));
    final.setAttribute("aria-invalid", String(Boolean(e?.overLimit || e?.invalid)));
    reason.classList.toggle("svcReasonMissing", Boolean(e?.reasonMissing));
    status.classList.toggle("missingField", status.classList.contains("missingField") && !status.value && enabled);
  });
}

function readPanel(panel) {
  const input = { serviceReview: readServiceInputs(panel) };
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
  writeServiceInputs(panel, review);
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
  refreshServiceInputs(panel, v);
  panel.querySelectorAll(".verifyGrid input").forEach((el) => { if (el.checked) el.closest("label").classList.remove("missingCheck"); });
  if (r.reviewStatus !== "NOT_REVIEWED") panel.querySelector("[data-field=reviewStatus]").classList.remove("missingField");

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
  const warnClass = (c) => (["ADJUSTMENT_REASON_REQUIRED", "SERVICE_REASON_REQUIRED", "SERVICE_STATUS_REQUIRED"].includes(c) ? "warning reasonMissing" : c === "STATUS_SET_AUTOMATICALLY" ? "warning info" : "warning");
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
  const sp = s.specializedService;
  $("sumTransferDays").textContent = [["OIL_TRANSFER", sp.oilTransferDays], ["CHEMICAL_TRANSFER", sp.chemicalTransferDays], ["GAS_TRANSFER", sp.gasTransferDays]]
    .map(([code, n]) => `${t(language, code)} ${n ?? 0}`).join(" / ");
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
  // v0.9.0 — final figures; "(adjusted — automatic N)" when the examiner changed a service figure.
  const ed = s.examinerDetermination;
  const services = Object.entries(ed.specialServiceApprovedDays || {});
  $("sumSpecialServices").innerHTML = services.length
    ? services.map(([code, days]) => {
      const adjusted = ed.specialServiceAdjusted?.[code];
      const note = adjusted ? ` <span class="adjustedTag">(${esc(t(language, "adjustedTag", { n: ed.specialServiceAutomaticDays?.[code] ?? 0 }))})</span>` : "";
      return `<li data-service="${code}"${adjusted ? ' class="adjusted"' : ""}>${esc(t(language, code))}: <strong>${days}</strong>${note}</li>`;
    }).join("")
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
    panel.querySelector(".serviceVettingSlot").innerHTML = serviceVettingHtml(v, i);
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
  record.examinerAssessment.reviewDate = $("reviewDate").value || todayIso(); // v0.9.0 — date of the current day
  $("examinerName").classList.toggle("missingField", $("examinerName").classList.contains("missingField") && !$("examinerName").value.trim());
}

/** v0.9.0 — lines with a special-service figure above the line's counted days. */
const overLimitLines = () => record.voyages.map((v, i) => (Object.values(v.examinerReview.serviceReview || {}).some((e) => e.overLimit) ? i + 1 : null)).filter(Boolean);

/**
 * v0.9.0 — before Export JSON / Export PDF: examiner name, a status and all five verification
 * boxes on every line, and no invalid values (special-service figures above the line's days included).
 */
function examinerExportProblems() {
  const items = [];
  if (!String($("examinerName").value || "").trim()) items.push(["EXAMINER_NAME_REQUIRED", {}]);
  record.voyages.forEach((v, i) => {
    const r = v.examinerReview;
    const n = i + 1;
    if (r.reviewStatus === "NOT_REVIEWED") items.push(["lineStatusRequired", { n }]);
    if (VERIFICATION_FIELDS.some((f) => !r[f])) items.push(["lineVerificationRequired", { n }]);
    if (Object.values(r.serviceReview || {}).some((e) => e.enabled && !e.reviewStatus)) items.push(["lineServiceStatusRequired", { n }]);
    if (Object.values(r.serviceReview || {}).some((e) => e.overLimit)) items.push(["lineServiceOverLimit", { n }]);
    else if (lineErrorState.get(i)) items.push(["lineHasErrors", { n }]);
  });
  return items;
}

function showBlocked(titleKey, items) {
  lastStatus = { key: titleKey, vars: {}, kind: "status-warning" };
  const p = $("statusPanel");
  p.className = "status-warning";
  p.innerHTML = `<strong>${esc(t(language, titleKey))}</strong><ul class="blockList">${items.map(([k, vars]) => `<li data-code="${k}">${esc(t(language, k, vars))}</li>`).join("")}</ul>`;
  p.scrollIntoView?.({ behavior: "smooth", block: "center" });
}

function exportAllowed() {
  collectRecordLevel();
  record.voyages.forEach((_, i) => onPanelInput(i));
  const items = examinerExportProblems();
  $("examinerName").classList.toggle("missingField", !String($("examinerName").value || "").trim());
  document.querySelectorAll(".reviewRow").forEach((row) => {
    const r = record.voyages[Number(row.dataset.index)].examinerReview;
    row.querySelectorAll(".verifyGrid input").forEach((el) => el.closest("label").classList.toggle("missingCheck", !el.checked));
    row.querySelector("[data-field=reviewStatus]").classList.toggle("missingField", r.reviewStatus === "NOT_REVIEWED");
    row.querySelectorAll(".svcTable tr[data-service]").forEach((tr) => {
      const e = r.serviceReview?.[tr.dataset.service];
      tr.querySelector("[data-sfield=reviewStatus]").classList.toggle("missingField", Boolean(e?.enabled && !e.reviewStatus));
    });
  });
  if (items.length) { showBlocked("examinerExportBlocked", items); return false; }
  return true;
}

const vettedFileName = () => exportFileName(record, "VETTED", record.calculationSummary?.examinerDetermination?.totalFinalAcceptedDays ?? 0);

function save() {
  if (!record) return setStatus("noRecord", {}, "status-warning");
  collectRecordLevel();
  record.voyages.forEach((_, i) => onPanelInput(i));
  const over = overLimitLines();
  if (over.length) return showBlocked("saveBlocked", over.map((n) => ["lineServiceOverLimit", { n }]));
  const errorLines = refreshSummary();
  record.auditTrail.push({ at: new Date().toISOString(), action: "EXAMINER_DRAFT_SAVED", by: record.examinerAssessment.examiner.examinerName || null });
  storage.saveRecord(record);
  if (errorLines) setStatus("savedWithErrors", { n: errorLines }, "status-warning");
  else setStatus("saved");
}

function exportJson() {
  if (!record) return setStatus("noRecord", {}, "status-warning");
  if (!exportAllowed()) return;
  const blob = new Blob([storage.exportRecord(record)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${vettedFileName()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function fillPrintView() {
  if (!record) { $("printView").innerHTML = ""; return; }
  collectRecordLevel();
  record.voyages.forEach((_, i) => onPanelInput(i));
  $("printView").innerHTML = examinerExportProblems().length
    ? exportBlockedPrintHtml(language, "examinerExportBlocked")
    : examinerPrintHtml(record, record.calculationSummary, language);
}

function exportPdf() {
  if (!record) return setStatus("noRecord", {}, "status-warning");
  if (!exportAllowed()) return;
  fillPrintView();
  setStatus("pdfHint");
  printRecord($("printView").innerHTML, vettedFileName());
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
  $("reviewDate").value = todayIso(); // v0.9.0 — shown automatically, today's date
  switchLanguage();
  setStatus("noRecord", {}, "");
});

// Test hook (read-only access for smoke tests and console debugging).
window.__examinerDev = Object.freeze({
  getRecord: () => record,
  fields: EXAMINER_INPUT_FIELDS
});
