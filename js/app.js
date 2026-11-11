import { SeaServiceCalculator } from "./seaServiceCalculator.js";

const calculator = new SeaServiceCalculator();
const STORAGE_KEY = "SeaServiceRecord";

const $ = (id) => document.getElementById(id);
const rowValue = (row, selector) => row.querySelector(selector)?.value ?? "";
const rowChecked = (row, selector) => row.querySelector(selector)?.checked ?? false;

function setText(id, value = 0) {
    const element = $(id);
    if (element) element.textContent = value ?? 0;
}

function calculateVoyageDays(embark, disembark) {
    if (!embark || !disembark) return 0;
    const start = new Date(`${embark}T00:00:00`);
    const end = new Date(`${disembark}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    return Math.floor((end - start) / 86400000) + 1;
}

function addRecord(data = {}) {
    const tbody = $("recordsBody");
    if (!tbody) return;

    const row = document.createElement("tr");
    row.innerHTML = `
        <td><select class="rank"><option></option><option>Able Seafarer Deck</option><option>Bridge Watch Rating</option><option>Deck Cadet</option><option>Mate</option><option>Chief Mate</option><option>Master</option><option>Engineer Cadet</option><option>Engineer Officer</option><option>Chief Engineer</option></select></td>
        <td><input type="text" class="vessel"></td>
        <td><div class="identifierGroup"><select class="idType"><option>Official</option><option>IMO</option></select><input type="text" class="identifier"></div></td>
        <td><input type="text" class="vesselType"></td>
        <td><input type="number" min="0" class="kw"></td>
        <td><select class="propulsion"><option></option><option>Motor</option><option>Steam</option><option>Diesel-Electric</option><option>Other</option></select></td>
        <td><input type="number" min="0" class="gt"></td>
        <td><select class="voyage"><option></option><option>NC1</option><option>NC2</option><option>Unlimited</option><option>Sheltered Waters</option></select></td>
        <td><input type="text" class="registry"></td>
        <td><select class="watch"><option value="8">8</option><option value="12">12</option></select></td>
        <td><input type="checkbox" class="polar"></td><td><input type="checkbox" class="ice"></td>
        <td><input type="checkbox" class="passenger"></td><td><input type="checkbox" class="tanker"></td>
        <td><input type="checkbox" class="fishing"></td><td><input type="checkbox" class="dp"></td>
        <td><input type="checkbox" class="offshore"></td>
        <td><input type="date" class="embark"></td><td><input type="date" class="disembark"></td>
        <td class="daysCell">0</td><td><button type="button" class="deleteBtn">Delete</button></td>`;

    tbody.appendChild(row);
    populateRow(row, data);
    row.addEventListener("change", calculateTotal);
    row.querySelector(".deleteBtn").addEventListener("click", () => {
        row.remove();
        if (!tbody.rows.length) addRecord();
        calculateTotal();
    });
}

function populateRow(row, data) {
    const values = {
        rank: data.rank, vessel: data.vessel, idType: data.idType, identifier: data.identifier,
        vesselType: data.vesselType, kw: data.kw, propulsion: data.propulsion, gt: data.gt,
        voyage: data.voyage, registry: data.registry, watch: data.watch
    };
    Object.entries(values).forEach(([name, value]) => {
        const control = row.querySelector(`.${name}`);
        if (control && value !== undefined && value !== null) control.value = value;
    });
    ["polar", "ice", "passenger", "tanker", "fishing", "dp", "offshore"].forEach((name) => {
        const control = row.querySelector(`.${name}`);
        if (control) control.checked = Boolean(data[name]);
    });
    row.querySelector(".embark").value = data.embark ?? "";
    row.querySelector(".disembark").value = data.disembark ?? "";
    row.querySelector(".daysCell").textContent = calculateVoyageDays(data.embark, data.disembark);
}

function buildVoyage(row) {
    const embark = rowValue(row, ".embark");
    const disembark = rowValue(row, ".disembark");
    const seaTimeDays = calculateVoyageDays(embark, disembark);
    row.querySelector(".daysCell").textContent = seaTimeDays;
    return {
        rank: rowValue(row, ".rank"), vessel: rowValue(row, ".vessel"), idType: rowValue(row, ".idType"),
        identifier: rowValue(row, ".identifier"), vesselType: rowValue(row, ".vesselType"),
        kw: Number(rowValue(row, ".kw") || 0), propulsion: rowValue(row, ".propulsion"),
        grossTonnage: Number(rowValue(row, ".gt") || 0), voyageClass: rowValue(row, ".voyage"),
        registry: rowValue(row, ".registry"), watchHours: Number(rowValue(row, ".watch") || 8),
        engagementDate: embark, dischargeDate: disembark, seaTimeDays,
        polarWaters: rowChecked(row, ".polar"), iceNavigation: rowChecked(row, ".ice"),
        passengerService: rowChecked(row, ".passenger"), tankerService: rowChecked(row, ".tanker"),
        fishingService: rowChecked(row, ".fishing"), dynamicPositioning: rowChecked(row, ".dp"),
        offshoreService: rowChecked(row, ".offshore")
    };
}

function detectOverlaps(voyages) {
    const warnings = [];
    const dated = voyages.filter((v) => v.engagementDate && v.dischargeDate && v.seaTimeDays > 0);
    for (let i = 0; i < dated.length; i += 1) {
        for (let j = i + 1; j < dated.length; j += 1) {
            if (new Date(dated[i].engagementDate) <= new Date(dated[j].dischargeDate) &&
                new Date(dated[i].dischargeDate) >= new Date(dated[j].engagementDate)) {
                warnings.push(`Possible overlap between dated voyage ${i + 1} and dated voyage ${j + 1}.`);
            }
        }
    }
    return warnings;
}

function updateReviewFindings(warnings) {
    const panel = $("reviewWarnings");
    if (panel) panel.innerHTML = warnings.length ? warnings.join("<br>") : "No findings.";
    setText("outstandingIssues", warnings.length);
}

function updateSummaryUI(summary = {}) {
    const mapping = {
        totalDays: "totalOnboardDays", acceptedDays: "totalQualifyingDays", service8Hours: "service8Hour",
        service12Hours: "service12Hour", captainDays: "captainDays", chiefOfficerDays: "chiefOfficerDays",
        officerDays: "officerDays", gt500Days: "gt500Days", gt3000Days: "gt3000Days",
        nearCoastalDays: "nearCoastalDays", unlimitedDays: "unlimitedDays", polarDays: "polarDays",
        iceDays: "iceNavigationDays", passengerDays: "passengerDays", fishingDays: "fishingDays",
        oilDays: "oilTankerDays", chemicalDays: "chemicalTankerDays", gasDays: "lngTankerDays",
        dpDays: "dynamicPositioningDays", offshoreDays: "offshoreDays"
    };
    Object.entries(mapping).forEach(([id, key]) => setText(id, summary[key] || 0));
    setText("claimedDaysReview", summary.totalOnboardDays || 0);
    setText("acceptedDaysReview", summary.totalQualifyingDays || 0);
}

function calculateTotal() {
    const rows = [...document.querySelectorAll("#recordsBody tr")];
    const voyages = rows.map(buildVoyage);
    const warnings = [];

    voyages.forEach((voyage, index) => {
        const number = index + 1;
        if ((voyage.engagementDate || voyage.dischargeDate) && voyage.seaTimeDays === 0) warnings.push(`Voyage ${number}: invalid or incomplete dates.`);
        if (voyage.seaTimeDays > 0 && !voyage.grossTonnage) warnings.push(`Voyage ${number}: missing GT value.`);
        if (voyage.rank.includes("Engineer") && voyage.seaTimeDays > 0 && !voyage.kw) warnings.push(`Voyage ${number}: missing kW value for engineering service.`);
    });
    warnings.push(...detectOverlaps(voyages));
    updateReviewFindings(warnings);

    let summary = {};
    try {
        summary = calculator.buildSummary(voyages) || {};
        updateSummaryUI(summary);
    } catch (error) {
        warnings.push(`Calculation engine error: ${error.message}`);
        updateReviewFindings(warnings);
    }

    const certificate = $("certificate")?.value || "";
    const statusPanel = $("statusPanel");
    if (statusPanel && typeof window.validateCertificateEligibility === "function" && typeof window.buildValidationMessage === "function") {
        const status = window.buildValidationMessage(window.validateCertificateEligibility(certificate, voyages));
        statusPanel.className = status.className || "";
        statusPanel.innerHTML = status.message || "Assessment completed.";
    } else if (statusPanel) {
        statusPanel.className = warnings.length ? "status-warning" : "status-success";
        statusPanel.textContent = warnings.length ? "Review findings require attention." : "Record calculated successfully.";
    }
    setText("recordsReviewed", voyages.filter((v) => v.seaTimeDays > 0).length);
    if (typeof window.evaluateCertificateRequirements === "function") window.evaluateCertificateRequirements();
}

function buildRecordObject() {
    return {
        surname: $("surname")?.value || "", givenNames: $("givenNames")?.value || "", cdn: $("cdn")?.value || "",
        applicationDate: $("applicationDate")?.value || "", certificate: $("certificate")?.value || "",
        certificateHeld: $("certificateHeld")?.value || "", applicantDeclaration: $("applicantDeclaration")?.checked || false,
        examinerComments: $("examinerComments")?.value || "",
        voyages: [...document.querySelectorAll("#recordsBody tr")].map((row) => {
            const v = buildVoyage(row);
            return { rank: v.rank, vessel: v.vessel, idType: v.idType, identifier: v.identifier, vesselType: v.vesselType,
                kw: v.kw, propulsion: v.propulsion, gt: v.grossTonnage, voyage: v.voyageClass, registry: v.registry,
                watch: v.watchHours, embark: v.engagementDate, disembark: v.dischargeDate, days: v.seaTimeDays,
                polar: v.polarWaters, ice: v.iceNavigation, passenger: v.passengerService, tanker: v.tankerService,
                fishing: v.fishingService, dp: v.dynamicPositioning, offshore: v.offshoreService };
        })
    };
}

function saveRecord() {
    calculateTotal();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildRecordObject()));
    window.alert("Record saved successfully.");
}

function restoreSavedRecord() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) { addRecord(); return; }
    try {
        const data = JSON.parse(saved);
        ["surname", "givenNames", "cdn", "applicationDate", "certificate", "certificateHeld", "examinerComments"].forEach((id) => {
            if ($(id) && data[id] !== undefined) $(id).value = data[id];
        });
        if ($("applicantDeclaration")) $("applicantDeclaration").checked = Boolean(data.applicantDeclaration);
        const voyages = Array.isArray(data.voyages) && data.voyages.length ? data.voyages : [{}];
        voyages.forEach(addRecord);
        calculateTotal();
    } catch (error) {
        console.error("Unable to restore saved record.", error);
        addRecord();
    }
}

function exportJson() {
    const blob = new Blob([JSON.stringify(buildRecordObject(), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "SeaServiceRecord.json";
    link.click();
    URL.revokeObjectURL(link.href);
}

function switchLanguage() {
    const french = $("langSelector")?.value === "fr";
    document.documentElement.lang = french ? "fr" : "en";
    if ($("title")) $("title").textContent = french ? "État de service en mer pour un brevet" : "Statement of Sea Service for a Certificate";
}

document.addEventListener("DOMContentLoaded", () => {
    restoreSavedRecord();
    $("langSelector")?.addEventListener("change", switchLanguage);
    $("certificate")?.addEventListener("change", calculateTotal);
});

window.addRecord = addRecord;
window.calculateTotal = calculateTotal;
window.saveRecord = saveRecord;
window.exportJson = exportJson;
