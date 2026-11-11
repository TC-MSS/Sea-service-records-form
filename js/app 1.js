import { SeaServiceCalculator } from "./seaServiceCalculator.js";

const calculator = new SeaServiceCalculator();
const STORAGE_KEY = "SeaServiceRecord";
const $ = (id) => document.getElementById(id);
const rowValue = (row, selector) => row.querySelector(selector)?.value ?? "";
const rowChecked = (row, selector) => row.querySelector(selector)?.checked ?? false;
let currentLanguage = "en";

const text = {
    en: {
        pageTitle: "Statement of Sea Service for a Certificate", applicantInformation: "Applicant Information",
        surname: "Surname", givenNames: "Given Names", cdnNumber: "CDN Number", applicationDate: "Application Date",
        certificateApplied: "Certificate Applied For", certificateHeld: "Certificate Held", seaServiceRecords: "Sea Service Records",
        capacity: "A<br>Capacity", vessel: "B<br>Vessel", officialImo: "C<br>Official / IMO", vesselType: "D<br>Vessel Type",
        propulsion: "F<br>Propulsion", voyage: "H<br>Voyage", registry: "I<br>Registry", watch: "J<br>Watch",
        iceService: "K<br>Ice", passenger: "L<br>Passenger", transferOperation: "M<br>Transfer operation", fishing: "N<br>Fishing",
        dpOffshore: "O<br>DP / Offshore", embark: "P<br>Embark", disembark: "Q<br>Disembark",
        daysOnBoard: "R<br>Days on board", daysAtSea: "S<br>Days at sea, if different", actions: "Actions",
        addVoyage: "Add Voyage", applicantDeclarationTitle: "Applicant Declaration",
        declaration: "I certify that the information provided in this sea service record is accurate and complete.",
        calculateService: "Calculate Service", save: "Save", exportJson: "Export JSON", print: "Print",
        select: "Select", none: "None", delete: "Delete", deck: "Deck Department", engine: "Engine Department",
        selectCertificate: "Select Certificate", noCertificate: "No certificate held", recordSaved: "Record saved successfully.",
        noFindings: "No findings.", reviewRequired: "Review findings require attention.", calculated: "Record calculated successfully.",
        invalidDates: "invalid or incomplete dates", missingGt: "missing GT value", missingKw: "missing kW value for engineering service",
        atSeaExceeds: "days at sea cannot exceed days on board", overlap: "Possible overlap between dated voyages",
        oilTransfer: "Oil transfer", chemicalTransfer: "Chemical transfer", gasTransfer: "Gas transfer", legacyTransfer: "Transfer operation type must be identified for this previously saved tanker-service record.", other: "Other", official: "Official", acceptableIce: "Acceptable ice service", polar: "Polar waters",
        polarIce: "Polar waters and acceptable ice service", dp: "Dynamic positioning service", offshore: "Offshore service",
        dpOffshoreBoth: "Dynamic positioning and offshore service"
    },
    fr: {
        pageTitle: "État de service en mer pour un brevet", applicantInformation: "Renseignements sur le candidat",
        surname: "Nom de famille", givenNames: "Prénoms", cdnNumber: "Numéro CDN", applicationDate: "Date de la demande",
        certificateApplied: "Brevet demandé", certificateHeld: "Brevet détenu", seaServiceRecords: "États de service en mer",
        capacity: "A<br>Fonction", vessel: "B<br>Bâtiment", officialImo: "C<br>Numéro officiel / OMI", vesselType: "D<br>Type de bâtiment",
        propulsion: "F<br>Propulsion", voyage: "H<br>Voyage", registry: "I<br>Immatriculation", watch: "J<br>Quart",
        iceService: "K<br>Glaces", passenger: "L<br>Passagers", transferOperation: "M<br>Opération de transfert", fishing: "N<br>Pêche",
        dpOffshore: "O<br>DP / au large", embark: "P<br>Embarquement", disembark: "Q<br>Débarquement",
        daysOnBoard: "R<br>Jours à bord", daysAtSea: "S<br>Jours en mer, s’ils diffèrent", actions: "Actions",
        addVoyage: "Ajouter un voyage", applicantDeclarationTitle: "Déclaration du candidat",
        declaration: "Je certifie que les renseignements fournis dans le présent état de service en mer sont exacts et complets.",
        calculateService: "Calculer le service", save: "Enregistrer", exportJson: "Exporter JSON", print: "Imprimer",
        select: "Sélectionner", none: "Aucun", delete: "Supprimer", deck: "Service du pont", engine: "Service des machines",
        selectCertificate: "Sélectionner un brevet", noCertificate: "Aucun brevet détenu", recordSaved: "Dossier enregistré.",
        noFindings: "Aucune observation.", reviewRequired: "Des observations doivent être examinées.", calculated: "Calcul effectué.",
        invalidDates: "dates invalides ou incomplètes", missingGt: "jauge brute manquante", missingKw: "puissance en kW manquante pour le service des machines",
        atSeaExceeds: "les jours en mer ne peuvent dépasser les jours à bord", overlap: "Chevauchement possible entre les voyages datés",
        oilTransfer: "Transfert d’hydrocarbures", chemicalTransfer: "Transfert de produits chimiques", gasTransfer: "Transfert de gaz liquéfié", legacyTransfer: "Le type d’opération de transfert doit être précisé pour cet ancien dossier de service sur bâtiment-citerne.", other: "Autre", official: "Officiel", acceptableIce: "Service acceptable dans les glaces", polar: "Eaux polaires",
        polarIce: "Eaux polaires et service acceptable dans les glaces", dp: "Service de positionnement dynamique", offshore: "Service au large",
        dpOffshoreBoth: "Service de positionnement dynamique et service au large"
    }
};

const capacities = [
    ["MASTER", "Master", "Capitaine"], ["CHIEF_MATE", "Chief Mate", "Premier officier de pont"],
    ["MATE", "Mate", "Officier de pont"], ["SUPERNUMERARY_MATE", "Supernumerary Mate", "Officier de pont surnuméraire"],
    ["ABLE_SEAFARER_DECK", "Able Seafarer Deck", "Matelot qualifié Pont"], ["BRIDGE_WATCH_RATING", "Bridge Watch Rating", "Matelot de quart à la passerelle"],
    ["DECK_CADET", "Deck Cadet", "Élève-officier de pont"],
    ["CHIEF_ENGINEER", "Chief Engineer", "Chef mécanicien"], ["SECOND_ENGINEER", "Second Engineer", "Second mécanicien"],
    ["ENGINEER_OFFICER", "Engineer Officer", "Officier mécanicien"], ["ENGINE_ROOM_RATING", "Engine-room Rating", "Matelot de la salle des machines"],
    ["ENGINEER_CADET", "Engineer Cadet", "Élève-officier mécanicien"]
];

const vesselTypes = [
    ["AIR_CUSHION", "Air cushion vessel", "Aéroglisseur"], ["BARGE", "Barge", "Chaland"],
    ["BULK_CARRIER", "Bulk carrier", "Vraquier"], ["CARGO", "Cargo vessel", "Bâtiment de charge"],
    ["CHEMICAL_TANKER", "Chemical tanker", "Bâtiment-citerne pour produits chimiques"], ["CONTAINER", "Container vessel", "Porte-conteneurs"],
    ["DREDGER", "Dredger", "Drague"], ["FERRY", "Ferry", "Traversier"], ["FISHING", "Fishing vessel", "Bâtiment de pêche"],
    ["GAS_TANKER", "Gas tanker", "Bâtiment-citerne pour gaz"], ["GENERAL_CARGO", "General cargo vessel", "Bâtiment de marchandises diverses"],
    ["HIGH_SPEED", "High-speed craft", "Engin à grande vitesse"], ["MOU", "Mobile offshore unit", "Unité mobile au large"],
    ["OIL_TANKER", "Oil tanker", "Pétrolier"], ["PASSENGER", "Passenger vessel", "Bâtiment à passagers"],
    ["PASSENGER_SUBMERSIBLE", "Passenger submersible craft", "Engin submersible à passagers"], ["RORO", "Ro-ro vessel", "Roulier"],
    ["SAIL_TRAINING", "Sail training vessel", "Voilier-école"], ["SAILING", "Sailing vessel", "Voilier"],
    ["SUPPLY", "Supply vessel", "Bâtiment de ravitaillement"], ["TUG", "Tug", "Remorqueur"],
    ["WIG", "Wing-in-ground craft", "Engin à effet de sol"], ["OTHER", "Other", "Autre"]
];

const certificates = [
    ["MASTER_MARINER", "Master Mariner", "Capitaine au long cours"], ["MASTER_NC", "Master, Near Coastal", "Capitaine, à proximité du littoral"],
    ["MASTER_3000_NC", "Master 3 000 Gross Tonnage, Near Coastal", "Capitaine, jauge brute de 3 000, à proximité du littoral"],
    ["MASTER_500_NC", "Master 500 Gross Tonnage, Near Coastal", "Capitaine, jauge brute de 500, à proximité du littoral"],
    ["MASTER_3000_DOM", "Master 3 000 Gross Tonnage, Domestic", "Capitaine, jauge brute de 3 000, navigation intérieure"],
    ["MASTER_500_DOM", "Master 500 Gross Tonnage, Domestic", "Capitaine, jauge brute de 500, navigation intérieure"],
    ["MASTER_150_DOM", "Master 150 Gross Tonnage, Domestic", "Capitaine, jauge brute de 150, navigation intérieure"],
    ["MASTER_LIMITED", "Master, Limited", "Capitaine, avec restrictions"], ["CHIEF_MATE", "Chief Mate", "Premier officier de pont"],
    ["CHIEF_MATE_NC", "Chief Mate, Near Coastal", "Premier officier de pont, à proximité du littoral"],
    ["WATCHKEEPING_MATE", "Watchkeeping Mate", "Officier de pont de quart"], ["WATCHKEEPING_MATE_NC", "Watchkeeping Mate, Near Coastal", "Officier de pont de quart, à proximité du littoral"],
    ["FISHING_1", "Fishing Master, First Class", "Capitaine de pêche, première classe"], ["FISHING_2", "Fishing Master, Second Class", "Capitaine de pêche, deuxième classe"],
    ["FISHING_3", "Fishing Master, Third Class", "Capitaine de pêche, troisième classe"], ["FISHING_4", "Fishing Master, Fourth Class", "Capitaine de pêche, quatrième classe"],
    ["ENGINEER_1_MOTOR", "First-class Engineer, Motor Ship", "Mécanicien de première classe, navire à moteur"],
    ["ENGINEER_1_STEAM", "First-class Engineer, Steamship", "Mécanicien de première classe, navire à vapeur"],
    ["ENGINEER_2_MOTOR", "Second-class Engineer, Motor Ship", "Mécanicien de deuxième classe, navire à moteur"],
    ["ENGINEER_2_STEAM", "Second-class Engineer, Steamship", "Mécanicien de deuxième classe, navire à vapeur"],
    ["ENGINEER_3_MOTOR", "Third-class Engineer, Motor Ship", "Mécanicien de troisième classe, navire à moteur"],
    ["ENGINEER_3_STEAM", "Third-class Engineer, Steamship", "Mécanicien de troisième classe, navire à vapeur"],
    ["ENGINEER_4_MOTOR", "Fourth-class Engineer, Motor Ship", "Mécanicien de quatrième classe, navire à moteur"],
    ["ENGINEER_4_STEAM", "Fourth-class Engineer, Steamship", "Mécanicien de quatrième classe, navire à vapeur"],
    ["WK_ENGINEER_FISHING", "Watchkeeping Engineer, Motor-driven Fishing Vessel", "Mécanicien de quart, bâtiment de pêche à moteur"],
    ["SVMO", "Small Vessel Machinery Operator", "Opérateur des machines de petits bâtiments"],
    ["ABLE_SEAFARER", "Able Seafarer", "Matelot qualifié"], ["BRIDGE_WATCH_RATING", "Bridge Watch Rating", "Matelot de quart à la passerelle"],
    ["ENGINE_ROOM_RATING", "Engine-room Rating", "Matelot de la salle des machines"]
];

function optionHtml(items, selected = "") {
    return items.map(([value, en, fr]) => `<option value="${value}"${value === selected ? " selected" : ""}>${currentLanguage === "fr" ? fr : en}</option>`).join("");
}
function populateCertificates() {
    const applied = $("certificate"); const held = $("certificateHeld");
    const appliedValue = applied?.value || ""; const heldValue = held?.value || "";
    if (applied) applied.innerHTML = `<option value="">${text[currentLanguage].selectCertificate}</option>${optionHtml(certificates, appliedValue)}`;
    if (held) held.innerHTML = `<option value="">${text[currentLanguage].noCertificate}</option>${optionHtml(certificates, heldValue)}`;
}
function setText(id, value = 0) { const el = $(id); if (el) el.textContent = value ?? 0; }
function calculateVoyageDays(embark, disembark) {
    if (!embark || !disembark) return 0;
    const start = new Date(`${embark}T00:00:00`); const end = new Date(`${disembark}T00:00:00`);
    return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start ? 0 : Math.floor((end - start) / 86400000) + 1;
}
function capacitySelect(value) {
    const deck = capacities.slice(0, 7), engine = capacities.slice(7);
    return `<select class="rank"><option value="">${text[currentLanguage].select}</option><optgroup label="${text[currentLanguage].deck}">${optionHtml(deck, value)}</optgroup><optgroup label="${text[currentLanguage].engine}">${optionHtml(engine, value)}</optgroup></select>`;
}
function makeSimpleSelect(cls, items, value = "") { return `<select class="${cls}"><option value="">${text[currentLanguage].select}</option>${optionHtml(items, value)}</select>`; }
function addRecord(data = {}) {
    const tbody = $("recordsBody"); if (!tbody) return;
    const row = document.createElement("tr");
    if (data.tanker === true && !data.transferOperation) data.legacyTankerService = true;
    const ice = data.iceService || (data.polar && data.ice ? "POLAR_AND_ACCEPTABLE_ICE" : data.polar ? "POLAR" : data.ice ? "ACCEPTABLE_ICE" : "NONE");
    const dpo = data.dpOffshore || (data.dp && data.offshore ? "DP_AND_OFFSHORE" : data.dp ? "DP" : data.offshore ? "OFFSHORE" : "NONE");
    row.innerHTML = `
      <td>${capacitySelect(data.rank || "")}</td><td><input class="vessel" value="${data.vessel || ""}"></td>
      <td><div class="identifierGroup"><select class="idType"><option value="OFFICIAL">${text[currentLanguage].official}</option><option value="IMO">IMO</option></select><input class="identifier" value="${data.identifier || ""}"></div></td>
      <td>${makeSimpleSelect("vesselType", vesselTypes, data.vesselType || "")}</td><td><input type="number" min="0" class="kw" value="${data.kw ?? ""}"></td>
      <td>${makeSimpleSelect("propulsion", [["MOTOR","Motor","Moteur"],["STEAM","Steam","Vapeur"],["DIESEL_ELECTRIC","Diesel-electric","Diesel-électrique"],["OTHER","Other","Autre"]], data.propulsion || "")}</td>
      <td><input type="number" min="0" class="gt" value="${data.gt ?? ""}"></td>
      <td>${makeSimpleSelect("voyage", [["NC1","NC1","PN1"],["NC2","NC2","PN2"],["UNLIMITED","Unlimited","Illimité"],["SHELTERED","Sheltered Waters","Eaux abritées"]], data.voyage || "")}</td>
      <td><input class="registry" value="${data.registry || ""}"></td><td><select class="watch"><option value="8">8</option><option value="12">12</option></select></td>
      <td>${makeSimpleSelect("iceService", [["NONE",text.en.none,text.fr.none],["POLAR",text.en.polar,text.fr.polar],["ACCEPTABLE_ICE",text.en.acceptableIce,text.fr.acceptableIce],["POLAR_AND_ACCEPTABLE_ICE",text.en.polarIce,text.fr.polarIce]], ice)}</td>
      <td><input type="checkbox" class="passenger" ${data.passenger ? "checked" : ""}></td><td>${makeSimpleSelect("transferOperation", [["NONE",text.en.none,text.fr.none],["OIL_TRANSFER",text.en.oilTransfer,text.fr.oilTransfer],["CHEMICAL_TRANSFER",text.en.chemicalTransfer,text.fr.chemicalTransfer],["GAS_TRANSFER",text.en.gasTransfer,text.fr.gasTransfer]], data.transferOperation || "NONE")}</td><td><input type="checkbox" class="fishing" ${data.fishing ? "checked" : ""}></td>
      <td>${makeSimpleSelect("dpOffshore", [["NONE",text.en.none,text.fr.none],["DP",text.en.dp,text.fr.dp],["OFFSHORE",text.en.offshore,text.fr.offshore],["DP_AND_OFFSHORE",text.en.dpOffshoreBoth,text.fr.dpOffshoreBoth]], dpo)}</td>
      <td><input type="date" class="embark" value="${data.embark || ""}"></td><td><input type="date" class="disembark" value="${data.disembark || ""}"></td>
      <td class="daysOnBoardCell">0</td><td><input type="number" min="0" class="daysAtSea" value="${data.daysAtSea ?? ""}"></td><td><button type="button" class="deleteBtn">${text[currentLanguage].delete}</button></td>`;
    tbody.appendChild(row);
    row.querySelector(".idType").value = data.idType || "OFFICIAL"; row.querySelector(".watch").value = String(data.watch || 8);
    row.addEventListener("change", calculateTotal);
    row.querySelector(".deleteBtn").addEventListener("click", () => { row.remove(); if (!tbody.rows.length) addRecord(); calculateTotal(); });
    updateRowDays(row);
}
function updateRowDays(row) { const days = calculateVoyageDays(rowValue(row,".embark"), rowValue(row,".disembark")); row.querySelector(".daysOnBoardCell").textContent = days; return days; }
function buildVoyage(row) {
    const daysOnBoard = updateRowDays(row); const entered = rowValue(row,".daysAtSea"); const daysAtSea = entered === "" ? daysOnBoard : Number(entered);
    const ice = rowValue(row,".iceService"), dpo = rowValue(row,".dpOffshore"), transferOperation = rowValue(row,".transferOperation");
    return { rank: rowValue(row,".rank"), vessel: rowValue(row,".vessel"), idType: rowValue(row,".idType"), identifier: rowValue(row,".identifier"),
      vesselType: rowValue(row,".vesselType"), kw: Number(rowValue(row,".kw")||0), propulsion: rowValue(row,".propulsion"), grossTonnage: Number(rowValue(row,".gt")||0),
      voyageClass: rowValue(row,".voyage"), registry: rowValue(row,".registry"), watchHours: Number(rowValue(row,".watch")||8), engagementDate: rowValue(row,".embark"), dischargeDate: rowValue(row,".disembark"),
      daysOnBoard, daysAtSea, seaTimeDays: daysAtSea, iceService: ice, polarWaters: ice === "POLAR" || ice === "POLAR_AND_ACCEPTABLE_ICE", iceNavigation: ice === "ACCEPTABLE_ICE" || ice === "POLAR_AND_ACCEPTABLE_ICE",
      passengerService: rowChecked(row,".passenger"), transferOperation, oilTransfer: transferOperation === "OIL_TRANSFER", chemicalTransfer: transferOperation === "CHEMICAL_TRANSFER", gasTransfer: transferOperation === "GAS_TRANSFER", tankerService: transferOperation !== "NONE", fishingService: rowChecked(row,".fishing"), dpOffshore: dpo,
      dynamicPositioning: dpo === "DP" || dpo === "DP_AND_OFFSHORE", offshoreService: dpo === "OFFSHORE" || dpo === "DP_AND_OFFSHORE" };
}
function detectOverlaps(voyages) { const warnings=[]; const dated=voyages.filter(v=>v.engagementDate&&v.dischargeDate&&v.daysOnBoard>0); for(let i=0;i<dated.length;i++)for(let j=i+1;j<dated.length;j++)if(new Date(dated[i].engagementDate)<=new Date(dated[j].dischargeDate)&&new Date(dated[i].dischargeDate)>=new Date(dated[j].engagementDate))warnings.push(`${text[currentLanguage].overlap} ${i+1} / ${j+1}.`); return warnings; }
function updateReviewFindings(warnings) { const panel=$("reviewWarnings"); if(panel) panel.innerHTML=warnings.length?warnings.join("<br>"):text[currentLanguage].noFindings; setText("outstandingIssues",warnings.length); }
function updateSummaryUI(summary={}) { const map={totalDays:"totalOnboardDays",acceptedDays:"totalQualifyingDays",service8Hours:"service8Hour",service12Hours:"service12Hour",captainDays:"captainDays",chiefOfficerDays:"chiefOfficerDays",officerDays:"officerDays",gt500Days:"gt500Days",gt3000Days:"gt3000Days",nearCoastalDays:"nearCoastalDays",unlimitedDays:"unlimitedDays",polarDays:"polarDays",iceDays:"iceNavigationDays",passengerDays:"passengerDays",fishingDays:"fishingDays",oilDays:"oilTankerDays",chemicalDays:"chemicalTankerDays",gasDays:"lngTankerDays",dpDays:"dynamicPositioningDays",offshoreDays:"offshoreDays"}; Object.entries(map).forEach(([id,key])=>setText(id,summary[key]||0)); setText("claimedDaysReview",summary.totalOnboardDays||0); setText("acceptedDaysReview",summary.totalQualifyingDays||0); }
function calculateTotal() {
    const voyages=[...document.querySelectorAll("#recordsBody tr")].map(buildVoyage), warnings=[];
    voyages.forEach((v,i)=>{const n=i+1;if((v.engagementDate||v.dischargeDate)&&v.daysOnBoard===0)warnings.push(`Voyage ${n}: ${text[currentLanguage].invalidDates}.`);if(v.daysAtSea>v.daysOnBoard)warnings.push(`Voyage ${n}: ${text[currentLanguage].atSeaExceeds}.`);if(v.daysOnBoard>0&&!v.grossTonnage)warnings.push(`Voyage ${n}: ${text[currentLanguage].missingGt}.`);if(v.legacyTankerService)warnings.push(`Voyage ${n}: ${text[currentLanguage].legacyTransfer}`);if(v.rank.includes("ENGINEER")&&v.daysOnBoard>0&&!v.kw)warnings.push(`Voyage ${n}: ${text[currentLanguage].missingKw}.`);}); warnings.push(...detectOverlaps(voyages));
    try { updateSummaryUI(calculator.buildSummary(voyages)||{}); } catch(error) { warnings.push(`Calculation engine error: ${error.message}`); }
    updateReviewFindings(warnings); const panel=$("statusPanel"); if(panel){panel.className=warnings.length?"status-warning":"status-success";panel.textContent=warnings.length?text[currentLanguage].reviewRequired:text[currentLanguage].calculated;} setText("recordsReviewed",voyages.filter(v=>v.daysOnBoard>0).length);
}
function serialiseVoyage(v) { return {rank:v.rank,vessel:v.vessel,idType:v.idType,identifier:v.identifier,vesselType:v.vesselType,kw:v.kw,propulsion:v.propulsion,gt:v.grossTonnage,voyage:v.voyageClass,registry:v.registry,watch:v.watchHours,embark:v.engagementDate,disembark:v.dischargeDate,daysOnBoard:v.daysOnBoard,daysAtSea:v.daysAtSea,iceService:v.iceService,passenger:v.passengerService,transferOperation:v.transferOperation,fishing:v.fishingService,dpOffshore:v.dpOffshore}; }
function buildRecordObject() { return {schemaVersion:"0.4.0",language:currentLanguage,surname:$("surname")?.value||"",givenNames:$("givenNames")?.value||"",cdn:$("cdn")?.value||"",applicationDate:$("applicationDate")?.value||"",certificate:$("certificate")?.value||"",certificateHeld:$("certificateHeld")?.value||"",applicantDeclaration:$("applicantDeclaration")?.checked||false,examinerComments:$("examinerComments")?.value||"",voyages:[...document.querySelectorAll("#recordsBody tr")].map(r=>serialiseVoyage(buildVoyage(r)))}; }
function saveRecord(){calculateTotal();localStorage.setItem(STORAGE_KEY,JSON.stringify(buildRecordObject()));window.alert(text[currentLanguage].recordSaved);}
function restoreSavedRecord(){const saved=localStorage.getItem(STORAGE_KEY);if(!saved){addRecord();return;}try{const data=JSON.parse(saved);currentLanguage=data.language||currentLanguage;document.documentElement.lang=currentLanguage;$("langSelector").value=currentLanguage;populateCertificates();["surname","givenNames","cdn","applicationDate","certificate","certificateHeld","examinerComments"].forEach(id=>{if($(id)&&data[id]!==undefined)$(id).value=data[id];});if($("applicantDeclaration"))$("applicantDeclaration").checked=Boolean(data.applicantDeclaration);(Array.isArray(data.voyages)&&data.voyages.length?data.voyages:[{}]).forEach(addRecord);calculateTotal();}catch(error){console.error("Unable to restore saved record.",error);addRecord();}}
function exportJson(){const blob=new Blob([JSON.stringify(buildRecordObject(),null,2)],{type:"application/json"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="SeaServiceRecord.json";link.click();URL.revokeObjectURL(link.href);}
function switchLanguage(){currentLanguage=$("langSelector")?.value==="fr"?"fr":"en";document.documentElement.lang=currentLanguage;document.title=text[currentLanguage].pageTitle;document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;if(text[currentLanguage][key])el.innerHTML=text[currentLanguage][key];});populateCertificates();const stored=[...document.querySelectorAll("#recordsBody tr")].map(r=>serialiseVoyage(buildVoyage(r)));$("recordsBody").innerHTML="";stored.forEach(addRecord);calculateTotal();}
document.addEventListener("DOMContentLoaded",()=>{currentLanguage=$("langSelector")?.value==="fr"?"fr":"en";populateCertificates();restoreSavedRecord();switchLanguage();$("langSelector")?.addEventListener("change",switchLanguage);$("certificate")?.addEventListener("change",calculateTotal);});
window.addRecord=addRecord;window.calculateTotal=calculateTotal;window.saveRecord=saveRecord;window.exportJson=exportJson;
