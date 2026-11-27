/**
 * Candidate form controller — v0.9.0.
 * v0.9.0: mandatory fields by certificate department (EXN 2), ice days above days on board
 * highlighted on the line and blocking export, "Days at sea" mandatory, file names
 * "CDN - SURNAME - UNVETTED QUALIFYING SEA SERVICE - …", application date defaults to today,
 * reminder of what to send to the Transport Canada Centre examiner.
 * v0.8.0: Applicant Declaration mandatory before Export JSON / PDF.
 * Shared by the PRODUCTION candidate page (index.html, through js/app.js) and the
 * development candidate page (dev/index.html). <body data-variant="production|development">
 * selects the page title; everything else is identical, so both pages always apply the
 * same rules as the examiner review (tp2293Engine.js — single source of truth).
 *
 * Builds a v0.5.0-schema record and calculates converted days automatically
 * (TP 2293 Chapter 3 / MPR ss. 115–117) as the candidate types. Results are
 * labelled UNVETTED — subject to examiner review.
 *
 * Storage: this browser only (key "SeaServiceRecord.v0.5.0.candidate"). The older
 * production record "SeaServiceRecord" (0.4.0) is read and converted in memory, never
 * overwritten. Export JSON produces the file the candidate e-mails to the examiner;
 * Import JSON re-opens such a file; Export PDF / Print produces a PDF copy.
 */
import { TEXT, t } from "./examinerI18n.js";
import { CAPACITIES, VESSEL_TYPES, CERTIFICATES, PROPULSION, VOYAGE_CLASSES } from "./referenceData.js";
import { createSeaServiceRecord, createVoyage, ENUMS } from "./dataModel.js";
import { recalculateVoyages, toNumberOrNull } from "./calculationEngine.js";
import { validateVoyage } from "./validationEngine.js";
import { buildSummary } from "./summaryEngine.js";
import * as storage from "./storageEngine.js";
import { candidatePrintHtml, exportBlockedPrintHtml, printRecord } from "./printView.js";
import { candidateExportCheck, certificateDepartment, MANDATORY_COLUMNS, FIELD_PATHS, iceExceeding, exportFileName, todayIso } from "./recordRules.js";

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let language = "en";
let record = null;
let lastStatus = null;
const variant = () => (document.body.dataset.variant === "production" ? "production" : "development");
const titleKey = () => (variant() === "production" ? "productionPageTitle" : "candidatePageTitle");

const TRANSFER = [["NONE", "none"], ["OIL_TRANSFER", "OIL_TRANSFER"], ["CHEMICAL_TRANSFER", "CHEMICAL_TRANSFER"], ["GAS_TRANSFER", "GAS_TRANSFER"]];
const DPO = [["NONE", "none"], ["DP", "DP"], ["OFFSHORE", "OFFSHORE"], ["DP_AND_OFFSHORE", "DP_AND_OFFSHORE"]];
const NUMERIC = new Set(["vessel.propulsionPowerKw", "vessel.grossTonnage", "service.watchHours", "dates.daysAtSeaEntered"]);

const listOptions = (list, selected) => list.map(([v, en, fr]) =>
  `<option value="${v}"${v === selected ? " selected" : ""}>${esc(language === "fr" ? fr : en)}</option>`).join("");
const keyOptions = (list, selected) => list.map(([v, key]) =>
  `<option value="${v}"${v === selected ? " selected" : ""}>${esc(t(language, key))}</option>`).join("");
const pick = (label) => `<option value="">${esc(t(language, label))}</option>`;

function getPath(obj, path) { return path.split(".").reduce((o, k) => o?.[k], obj); }
function setPath(obj, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((o, k) => (o[k] && typeof o[k] === "object" ? o[k] : (o[k] = {})), obj)[last] = value;
}
const isNumericPath = (path) => NUMERIC.has(path) || path.endsWith(".days");

function setStatus(key, kind = "status-success") {
  lastStatus = { key, kind };
  const p = $("statusPanel");
  p.className = kind;
  p.textContent = key ? t(language, key) : "";
}

function applyStaticText() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = TEXT[language][el.dataset.i18n];
    if (v !== undefined) el.innerHTML = v;
  });
  document.title = t(language, titleKey());
}

function populateCertificates() {
  $("certificate").innerHTML = pick("selectCertificate") + listOptions(CERTIFICATES, record.application.certificateAppliedFor.code);
  $("certificateHeld").innerHTML = pick("noCertificate") + listOptions(CERTIFICATES, record.application.certificateHeld.code);
}

function capacitySelect(value) {
  return `<select data-path="service.capacityCode">${pick("select")}
    <optgroup label="${esc(t(language, "deck"))}">${listOptions(CAPACITIES.slice(0, 7), value)}</optgroup>
    <optgroup label="${esc(t(language, "engine"))}">${listOptions(CAPACITIES.slice(7), value)}</optgroup></select>`;
}

function rowHtml(v, i) {
  const val = (p) => esc(getPath(v, p) ?? "");
  const watch = v.service.watchHours ?? 8;
  return `
    <td class="num">${i + 1}</td>
    <td>${capacitySelect(v.service.capacityCode)}</td>
    <td><input data-path="vessel.vesselName" value="${val("vessel.vesselName")}"></td>
    <td><div class="identifierGroup"><select data-path="vessel.identifierType">
        <option value="OFFICIAL"${v.vessel.identifierType !== "IMO" ? " selected" : ""}>${esc(t(language, "official"))}</option>
        <option value="IMO"${v.vessel.identifierType === "IMO" ? " selected" : ""}>IMO</option></select>
        <input data-path="vessel.identifierNumber" value="${val("vessel.identifierNumber")}"></div></td>
    <td><select data-path="vessel.vesselTypeCode">${pick("select")}${listOptions(VESSEL_TYPES, v.vessel.vesselTypeCode)}</select></td>
    <td><input type="number" min="0" data-path="vessel.propulsionPowerKw" value="${val("vessel.propulsionPowerKw")}"></td>
    <td><select data-path="vessel.propulsionType">${pick("select")}${listOptions(PROPULSION, v.vessel.propulsionType)}</select></td>
    <td><input type="number" min="0" data-path="vessel.grossTonnage" value="${val("vessel.grossTonnage")}"></td>
    <td><select data-path="vessel.voyageClassification">${pick("select")}${listOptions(VOYAGE_CLASSES, v.vessel.voyageClassification)}</select></td>
    <td><input data-path="vessel.portOrCountryOfRegistry" value="${val("vessel.portOrCountryOfRegistry")}"></td>
    <td><select data-path="service.watchHours">
        <option value="8"${Number(watch) !== 12 ? " selected" : ""}>8</option>
        <option value="12"${Number(watch) === 12 ? " selected" : ""}>12</option></select></td>
    <td class="iceCell">${iceCellHtml(v)}</td>
    <td class="center"><input type="checkbox" data-path="specializedService.passengerService"${v.specializedService.passengerService ? " checked" : ""}></td>
    <td><select data-path="specializedService.transferOperation">${keyOptions(TRANSFER, v.specializedService.transferOperation)}</select></td>
    <td class="center"><input type="checkbox" data-path="specializedService.fishingService"${v.specializedService.fishingService ? " checked" : ""}></td>
    <td><select data-path="specializedService.dpOffshoreService">${keyOptions(DPO, v.specializedService.dpOffshoreService)}</select></td>
    <td><input type="date" data-path="dates.embarkationDate" value="${val("dates.embarkationDate")}"></td>
    <td><input type="date" data-path="dates.disembarkationDate" value="${val("dates.disembarkationDate")}"></td>
    <td class="num" data-col="daysOnBoard"></td>
    <td><input type="number" min="0" data-path="dates.daysAtSeaEntered" value="${val("dates.daysAtSeaEntered")}"></td>
    <td class="num" data-col="convertedDays"></td>
    <td><button type="button" class="deleteBtn">${esc(t(language, "deleteLine"))}</button></td>`;
}

/**
 * Column K (v0.7.0): the ice conditions may be combined; each selected condition
 * has its own number of days. Typing days ticks the condition; unticking clears the days.
 */
function iceCellHtml(v) {
  const c = v.specializedService.iceConditions || {};
  return ENUMS.iceConditions.map((code) => {
    const item = c[code] || { selected: false, days: null };
    return `<div class="iceOption" data-ice="${code}">
      <label><input type="checkbox" data-path="specializedService.iceConditions.${code}.selected"${item.selected ? " checked" : ""}> ${esc(t(language, code))}</label>
      <input type="number" min="0" step="1" inputmode="numeric" class="iceDays" data-path="specializedService.iceConditions.${code}.days"
        value="${item.days ?? ""}" aria-label="${esc(t(language, code))} — ${esc(t(language, "iceDaysLabel"))}" placeholder="${esc(t(language, "iceDaysLabel"))}"></div>`;
  }).join("");
}

function linkIceInputs(target) {
  const box = target?.closest?.(".iceOption");
  if (!box) return;
  const check = box.querySelector("input[type=checkbox]");
  const days = box.querySelector(".iceDays");
  if (target === days && Number(days.value) > 0) check.checked = true;
  if (target === check && !check.checked) days.value = "";
}

function readRow(row, v) {
  row.querySelectorAll("[data-path]").forEach((el) => {
    const path = el.dataset.path;
    let value = el.type === "checkbox" ? el.checked : el.value;
    if (isNumericPath(path)) value = toNumberOrNull(value);
    else if (path.startsWith("dates.") && value === "") value = null;
    setPath(v, path, value);
  });
  const cap = v.service.capacityCode;
  v.service.department = !cap ? "" : CAPACITIES.findIndex(([c]) => c === cap) < 7 ? "DECK" : "ENGINE";
  v.metadata.updatedAt = new Date().toISOString();
}

function convertedCell(v) {
  const c = v.calculation;
  const title = esc(language === "fr" ? c.explanationFr : c.explanationEn);
  if (c.conversionStatus === "CALCULATED" && c.convertedDays !== null) return `<span class="converted" title="${title}">${c.convertedDays}</span>`;
  const key = c.conversionStatus === "MANUAL_REVIEW_REQUIRED" ? "manualReview" : c.conversionStatus === "CALCULATION_ERROR" ? "calculationError" : "notCalculated";
  return `<span class="notCalculated" title="${title}">${esc(t(language, key))}</span>`;
}

const monthsText = (m) => `${language === "fr" ? String(m).replace(".", ",") : m} ${t(language, "months")}`;

/** Recalculate everything and refresh computed cells, summary and findings (inputs untouched). */
function refresh() {
  recalculateVoyages(record.voyages);
  document.querySelectorAll("#recordsBody tr").forEach((row, i) => {
    const v = record.voyages[i];
    row.querySelector("[data-col=daysOnBoard]").textContent = v.dates.daysOnBoard ?? "";
    row.querySelector("[data-col=convertedDays]").innerHTML = convertedCell(v);
    markIceExceeding(row, v);
  });
  markMandatory();
  const s = buildSummary(record.voyages);
  record.calculationSummary = s;
  record.calculatedAt = new Date().toISOString();
  const ac = s.automatedCalculation;
  $("sumDaysOnBoard").textContent = s.candidateClaim.totalDaysOnBoard;
  $("sumDaysAtSea").textContent = s.candidateClaim.totalDaysAtSea;
  $("sumConvertedDays").textContent = ac.totalConvertedDays === null ? t(language, "notCalculated") : ac.totalConvertedDays;
  $("sumConvertedMonths").textContent = ac.totalConvertedMonths === null ? "" : `(${monthsText(ac.totalConvertedMonths)})`;
  $("sumManual").textContent = ac.recordsRequiringManualReview;
  $("sumNotCalculated").textContent = ac.recordsNotCalculated;
  $("sumOverlap").textContent = ac.overlapDays;
  $("sumJuniorExcess").textContent = ac.juniorOfficerExcessDays;
  $("sumPolarDays").textContent = s.specializedService.polarDays;
  $("sumIceDays").textContent = s.specializedService.acceptableIceDays;

  const items = [];
  record.voyages.forEach((v, i) => {
    const hasDates = v.dates.embarkationDate || v.dates.disembarkationDate;
    if (!hasDates && v.calculation.conversionStatus === "NOT_CALCULATED" && record.voyages.length > 0 && !v.vessel.vesselName) return; // untouched blank line
    const res = validateVoyage(v);
    const line = t(language, "lineN", { n: i + 1 });
    const expl = language === "fr" ? v.calculation.explanationFr : v.calculation.explanationEn;
    items.push(`<li class="explain" data-line="${i + 1}"><strong>${esc(line)}</strong> — ${esc(expl)}</li>`);
    for (const c of res.errors) items.push(`<li class="error" data-code="${c}">${esc(line)}: ${esc(t(language, c))}</li>`);
    for (const c of res.warnings) {
      const extra = c === "OVERLAPPING_SERVICE" ? ` (${v.calculation.overlaps.map((o) => `${t(language, "lineN", { n: o.line })}: ${o.days}`).join(", ")})` : "";
      items.push(`<li class="warning" data-code="${c}">${esc(line)}: ${esc(t(language, c))}${esc(extra)}</li>`);
    }
  });
  for (const c of s.warnings.filter((w) => w === "JUNIOR_OFFICER_CAP_APPLIED")) items.push(`<li class="warning" data-code="${c}">${esc(t(language, c))}</li>`);
  $("findings").innerHTML = items.length ? items.join("") : `<li>${esc(t(language, "noFindings"))}</li>`;
}

function render() {
  applyStaticText();
  populateCertificates();
  const c = record.candidate;
  $("surname").value = c.surname || "";
  $("givenNames").value = c.givenNames || "";
  $("cdn").value = c.cdnNumber || "";
  // v0.9.0 — application date defaults to today; it stays editable.
  if (!record.application.applicationDate) record.application.applicationDate = todayIso();
  $("applicationDate").value = record.application.applicationDate || "";
  $("applicantDeclaration").checked = Boolean(c.declarationAccepted);
  updateDeclarationState();

  const tbody = $("recordsBody");
  tbody.innerHTML = "";
  if (!record.voyages.length) record.voyages.push(createVoyage(1));
  record.voyages.forEach((v, i) => {
    const row = document.createElement("tr");
    row.dataset.index = i;
    row.innerHTML = rowHtml(v, i);
    const onChange = (e) => { linkIceInputs(e?.target); readRow(row, record.voyages[Number(row.dataset.index)]); refresh(); };
    row.addEventListener("input", onChange);
    row.addEventListener("change", onChange);
    row.querySelector(".deleteBtn").addEventListener("click", () => {
      record.voyages.splice(Number(row.dataset.index), 1);
      record.voyages.forEach((x, n) => { x.sequenceNumber = n + 1; });
      render();
    });
    tbody.appendChild(row);
  });
  refresh();
  if (lastStatus) setStatus(lastStatus.key, lastStatus.kind);
}

function collectHeader() {
  record.language = language;
  record.candidate.surname = $("surname").value;
  record.candidate.givenNames = $("givenNames").value;
  record.candidate.cdnNumber = $("cdn").value;
  record.candidate.declarationAccepted = $("applicantDeclaration").checked;
  record.candidate.declarationDate = record.candidate.declarationAccepted ? (record.candidate.declarationDate || new Date().toISOString().slice(0, 10)) : null;
  record.application.applicationDate = $("applicationDate").value || null;
  const setCert = (target, code) => {
    const item = CERTIFICATES.find(([v]) => v === code);
    target.code = code;
    target.labelEn = item ? item[1] : "";
    target.labelFr = item ? item[2] : "";
  };
  setCert(record.application.certificateAppliedFor, $("certificate").value);
  setCert(record.application.certificateHeld, $("certificateHeld").value);
}

function save() {
  collectHeader();
  refresh();
  record.auditTrail.push({ at: new Date().toISOString(), action: "CANDIDATE_SAVED" });
  storage.saveCandidateRecord(record);
  setStatus("recordSaved");
}

/**
 * v0.9.0 — Column K: ice days above the line's days on board are highlighted on the line
 * (ice-days box, column R and a short message in the cell), updated as the candidate types.
 */
function markIceExceeding(row, v) {
  const over = iceExceeding(v);
  row.querySelectorAll(".iceOption").forEach((box) => {
    const bad = over.includes(box.dataset.ice);
    box.classList.toggle("iceExceed", bad);
    let msg = box.querySelector(".iceMsg");
    if (bad && !msg) { msg = document.createElement("div"); msg.className = "iceMsg"; box.appendChild(msg); }
    if (msg) { msg.textContent = bad ? t(language, "iceExceedsCell", { n: v.dates.daysOnBoard }) : ""; if (!bad) msg.remove(); }
  });
  row.querySelector("[data-col=daysOnBoard]").classList.toggle("iceExceedR", over.length > 0);
}

/**
 * v0.9.0 — mandatory columns (EXN 2) depend on the certificate applied for: "*" in the header;
 * after a refused export, empty mandatory inputs are outlined in red until filled.
 */
function markMandatory() {
  const dept = certificateDepartment($("certificate").value) || "DECK";
  const cols = MANDATORY_COLUMNS[dept];
  const ths = document.querySelectorAll("#serviceTable thead th");
  Object.keys(FIELD_PATHS).forEach((letter) => ths[letter.charCodeAt(0) - 64]?.classList.toggle("mandatory", cols.includes(letter)));
  const show = $("serviceTable").classList.contains("showRequired");
  document.querySelectorAll("#recordsBody tr").forEach((row) => {
    Object.entries(FIELD_PATHS).forEach(([letter, path]) => {
      const el = row.querySelector(`[data-path="${path}"]`);
      if (!el) return;
      const missing = show && cols.includes(letter) && (el.value === "" || el.value === null);
      el.classList.toggle("missingField", missing);
    });
  });
}

/**
 * v0.9.0 — everything required before Export JSON / Export PDF / Print:
 * certificate, surname, CDN, declaration, mandatory fields for the certificate's department,
 * and ice days not above days on board. Shows the list and highlights what is missing.
 */
function exportAllowed() {
  collectHeader();
  refresh();
  const check = candidateExportCheck(record);
  updateDeclarationState();
  if (check.ok) { $("serviceTable").classList.remove("showRequired"); markMandatory(); return true; }
  $("serviceTable").classList.add("showRequired");
  markMandatory();
  if (check.header.includes("DECLARATION_REQUIRED")) $("declarationSection").classList.add("declarationMissing");
  const items = [
    ...check.header.map((c) => `<li data-code="${c}">${esc(t(language, c))}</li>`),
    ...check.lines.flatMap((l) => [
      ...(l.missing.length ? [`<li data-code="MISSING" data-line="${l.line}">${esc(t(language, "missingColumns", { n: l.line, cols: l.missing.join(", ") }))}</li>`] : []),
      ...l.errors.map((c) => `<li data-code="${c}" data-line="${l.line}">${esc(t(language, "lineN", { n: l.line }))}: ${esc(t(language, c))}</li>`)
    ])
  ];
  lastStatus = { key: "exportBlocked", kind: "status-warning" };
  const p = $("statusPanel");
  p.className = "status-warning";
  p.innerHTML = `<strong>${esc(t(language, "exportBlocked"))}</strong><ul class="blockList">${items.join("")}</ul>`;
  p.scrollIntoView?.({ behavior: "smooth", block: "center" });
  return false;
}

function updateDeclarationState() {
  const ok = $("applicantDeclaration").checked;
  const section = $("declarationSection");
  section.classList.toggle("declarationOk", ok);
  if (ok) section.classList.remove("declarationMissing");
}

const fileName = () => exportFileName(record, "UNVETTED", record.calculationSummary?.automatedCalculation?.totalConvertedDays ?? 0);

function exportJson() {
  if (!exportAllowed()) return;
  const blob = new Blob([storage.exportRecord(record)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileName()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function fillPrintView() {
  if (!record) return;
  collectHeader();
  refresh();
  $("printView").innerHTML = candidateExportCheck(record).ok
    ? candidatePrintHtml(record, record.calculationSummary, language, t(language, titleKey()))
    : exportBlockedPrintHtml(language);
}

function exportPdf() {
  if (!exportAllowed()) return;
  fillPrintView();
  setStatus("pdfHint", "status-success");
  printRecord($("printView").innerHTML, fileName());
}

async function importJson(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    record = storage.importRecord(await file.text());
    language = record.language === "fr" ? "fr" : language;
    $("langSelector").value = language;
    document.documentElement.lang = language;
    lastStatus = { key: "imported", kind: "status-success" };
    render();
  } catch (err) {
    console.error(err);
    setStatus("importError", "status-error");
  }
  e.target.value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  const loaded = storage.loadCandidateRecord();
  record = loaded || createSeaServiceRecord("en");
  language = record.language === "fr" ? "fr" : "en";
  $("langSelector").value = language;
  if (loaded && loaded.migration) lastStatus = { key: "candidateLoadedLegacy", kind: "status-success" };
  document.documentElement.lang = language;
  render();

  $("langSelector").addEventListener("change", () => {
    collectHeader();
    language = $("langSelector").value === "fr" ? "fr" : "en";
    document.documentElement.lang = language;
    render();
  });
  ["surname", "givenNames", "cdn", "applicationDate", "certificate", "certificateHeld", "applicantDeclaration"]
    .forEach((id) => $(id).addEventListener("change", collectHeader));
  $("certificate").addEventListener("change", markMandatory);
  $("applicantDeclaration").addEventListener("change", () => {
    updateDeclarationState();
    if ($("applicantDeclaration").checked && lastStatus?.key === "declarationRequired") setStatus(null, "");
  });
  $("btnAdd").addEventListener("click", () => {
    collectHeader();
    record.voyages.push(createVoyage(record.voyages.length + 1));
    render();
  });
  $("btnSave").addEventListener("click", save);
  $("btnExport").addEventListener("click", exportJson);
  $("btnPrint").addEventListener("click", exportPdf);
  $("fileImport").addEventListener("change", importJson);
  window.addEventListener("beforeprint", fillPrintView);
  $("btnNew").addEventListener("click", () => {
    if (!window.confirm(t(language, "confirmNew"))) return;
    record = createSeaServiceRecord(language);
    lastStatus = null;
    render();
  });
});

window.__candidateDev = Object.freeze({ getRecord: () => record });
