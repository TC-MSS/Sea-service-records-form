// =====================================================
// Sea Service Record Application
// Phase 3
// =====================================================

import {
    SeaServiceCalculator
} from "./seaServiceCalculator.js";

const calculator =
    new SeaServiceCalculator();

// =====================================================
// Startup
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    addRecord();

    restoreSavedRecord();

    document
        .getElementById("langSelector")
        .addEventListener(
            "change",
            switchLanguage
        );
});

// =====================================================
// Add New Voyage Row
// =====================================================

function addRecord() {

    const tbody =
        document.getElementById(
            "recordsBody"
        );

    const row =
        document.createElement("tr");

    row.innerHTML = `
<td>
<select class="rank">
<option></option>
<option>Able Seafarer Deck</option>
<option>Bridge Watch Rating</option>
<option>Deck Cadet</option>
<option>Mate</option>
<option>Chief Mate</option>
<option>Master</option>
<option>Engineer Cadet</option>
<option>Engineer Officer</option>
<option>Chief Engineer</option>
</select>
</td>

<td>
<input type="text" class="vessel">
</td>

<td>
<div style="display:flex;gap:5px;">
<select class="idType">
<option>Official</option>
<option>IMO</option>
</select>

<input type="text" class="identifier">
</div>
</td>

<td>
<input type="text" class="vesselType">
</td>

<td>
<input type="number" class="kw">
</td>

<td>
<select class="propulsion">
<option></option>
<option>Motor</option>
<option>Steam</option>
<option>Diesel-Electric</option>
<option>Other</option>
</select>
</td>

<td>
<input type="number" class="gt">
</td>

<td>
<select class="voyage">
<option></option>
<option>NC1</option>
<option>NC2</option>
<option>Unlimited</option>
<option>Sheltered Waters</option>
</select>
</td>

<td>
<input type="text" class="registry">
</td>

<td>
<select class="watch" onchange="calculateTotal()">
<option>8</option>
<option>12</option>
</select>
</td>

<td>
<input
type="date"
class="embark"
onchange="calculateTotal()">
</td>

<td>
<input
type="date"
class="disembark"
onchange="calculateTotal()">
</td>

<td class="daysCell">
0
</td>

<td>
<button
class="deleteBtn"
onclick="deleteRow(this)">
Delete
</button>
</td>
`;

    tbody.appendChild(row);
}

// =====================================================
// Delete Row
// =====================================================

function deleteRow(button) {

    button
        .closest("tr")
        .remove();

    calculateTotal();
}

// =====================================================
// Calculate Voyage Days
// =====================================================

function calculateVoyageDays(
    embark,
    disembark
) {

    const start =
        new Date(embark);

    const end =
        new Date(disembark);

    return (
        Math.floor(
            (
                end - start
            ) /
            (
                1000 *
                60 *
                60 *
                24
            )
        ) + 1
    );
}

// =====================================================
// Main Calculation
// =====================================================

function calculateTotal() {

    const warnings = [];

    const voyages = [];

    const rows =
        document.querySelectorAll(
            "#recordsBody tr"
        );

    rows.forEach(row => {

        const embark =
            row.querySelector(
                ".embark"
            ).value;

        const disembark =
            row.querySelector(
                ".disembark"
            ).value;

        if (
            !embark ||
            !disembark
        ) {
            return;
        }

        if (
            new Date(disembark)
            <
            new Date(embark)
        ) {

            warnings.push(
                "Disembarkation date before embarkation date."
            );

            return;
        }

        const seaTimeDays =
            calculateVoyageDays(
                embark,
                disembark
            );

        row.querySelector(
            ".daysCell"
        ).textContent =
            seaTimeDays;

        voyages.push({

            rank:
                row.querySelector(
                    ".rank"
                ).value,

            grossTonnage:
                row.querySelector(
                    ".gt"
                ).value,

            voyageClass:
                row.querySelector(
                    ".voyage"
                ).value,

            watchHours:
                row.querySelector(
                    ".watch"
                ).value,

            engagementDate:
                embark,

            dischargeDate:
                disembark,

            seaTimeDays:
                seaTimeDays,

            polarWaters:
                document.getElementById(
                    "polar"
                )?.checked || false,

            iceNavigation:
                document.getElementById(
                    "ice"
                )?.checked || false,

            oilTanker:
                document.getElementById(
                    "oil"
                )?.checked || false,

            chemicalTanker:
                document.getElementById(
                    "chemical"
                )?.checked || false,

            lngTanker:
                document.getElementById(
                    "lng"
                )?.checked || false
        });
    });

    const summary =
        calculator.buildSummary(
            voyages
        );

    updateSummaryUI(
        summary
    );

    updateStatus(
        warnings
    );

    if (
        typeof evaluateCertificateRequirements
        === "function"
    ) {

        evaluateCertificateRequirements();
    }
}

// =====================================================
// Summary Panel
// =====================================================

function updateSummaryUI(
    summary
) {

    if (
        document.getElementById(
            "totalDays"
        )
    ) {

        document.getElementById(
            "totalDays"
        ).textContent =
            summary.totalOnboardDays;
    }

    if (
        document.getElementById(
            "acceptedDays"
        )
    ) {

        document.getElementById(
            "acceptedDays"
        ).textContent =
            summary.totalQualifyingDays;
    }

    if (
        document.getElementById(
            "polarDays"
        )
    ) {

        document.getElementById(
            "polarDays"
        ).textContent =
            summary.polarDays || 0;
    }

    if (
        document.getElementById(
            "iceDays"
        )
    ) {

        document.getElementById(
            "iceDays"
        ).textContent =
            summary.iceNavigationDays || 0;
    }

    if (
        document.getElementById(
            "oilDays"
        )
    ) {

        document.getElementById(
            "oilDays"
        ).textContent =
            summary.oilTankerDays || 0;
    }

    if (
        document.getElementById(
            "chemicalDays"
        )
    ) {

        document.getElementById(
            "chemicalDays"
        ).textContent =
            summary.chemicalTankerDays || 0;
    }

    if (
        document.getElementById(
            "lngDays"
        )
    ) {

        document.getElementById(
            "lngDays"
        ).textContent =
            summary.lngTankerDays || 0;
    }
}

// =====================================================
// Status Panel
// =====================================================

function updateStatus(
    warnings
) {

    const panel =
        document.getElementById(
            "statusPanel"
        );

    panel.className = "";

    if (
        warnings.length === 0
    ) {

        panel.classList.add(
            "status-success"
        );

        panel.innerHTML =
            "Record validated successfully.";

        return;
    }

    panel.classList.add(
        "status-warning"
    );

    panel.innerHTML =
        warnings.join("<br>");
}

// =====================================================
// Save Record
// =====================================================

function saveRecord() {

    const data =
        buildRecordObject();

    localStorage.setItem(
        "SeaServiceRecord",
        JSON.stringify(data)
    );

    alert(
        "Record saved successfully."
    );
}

// =====================================================
// Build Object
// =====================================================

function buildRecordObject() {

    const voyages = [];

    document
        .querySelectorAll(
            "#recordsBody tr"
        )
        .forEach(row => {

            voyages.push({

                rank:
                    row.querySelector(
                        ".rank"
                    ).value,

                vessel:
                    row.querySelector(
                        ".vessel"
                    ).value,

                identifier:
                    row.querySelector(
                        ".identifier"
                    ).value,

                gt:
                    row.querySelector(
                        ".gt"
                    ).value,

                voyage:
                    row.querySelector(
                        ".voyage"
                    ).value,

                embark:
                    row.querySelector(
                        ".embark"
                    ).value,

                disembark:
                    row.querySelector(
                        ".disembark"
                    ).value,

                days:
                    row.querySelector(
                        ".daysCell"
                    ).textContent
            });
        });

    return {

        surname:
            document.getElementById(
                "surname"
            ).value,

        givenNames:
            document.getElementById(
                "givenNames"
            ).value,

        cdn:
            document.getElementById(
                "cdn"
            ).value,

        certificate:
            document.getElementById(
                "certificate"
            ).value,

        voyages,

        specialOperations: {

            polar:
                document.getElementById(
                    "polar"
                ).checked,

            ice:
                document.getElementById(
                    "ice"
                ).checked,

            oil:
                document.getElementById(
                    "oil"
                ).checked,

            chemical:
                document.getElementById(
                    "chemical"
                ).checked,

            lng:
                document.getElementById(
                    "lng"
                ).checked,

            lpg:
                document.getElementById(
                    "lpg"
                ).checked
        }
    };
}

// =====================================================
// Restore
// =====================================================

function restoreSavedRecord() {

    const saved =
        localStorage.getItem(
            "SeaServiceRecord"
        );

    if (!saved)
        return;

    console.log(
        "Saved record detected."
    );
}

// =====================================================
// Export
// =====================================================

function exportJson() {

    const data =
        JSON.stringify(
            buildRecordObject(),
            null,
            2
        );

    const blob =
        new Blob(
            [data],
            {
                type:
                    "application/json"
            }
        );

    const link =
        document.createElement(
            "a"
        );

    link.href =
        URL.createObjectURL(
            blob
        );

    link.download =
        "SeaServiceRecord.json";

    document.body.appendChild(
        link
    );

    link.click();

    document.body.removeChild(
        link
    );
}

// =====================================================
// Language
// =====================================================

function switchLanguage() {

    const lang =
        document.getElementById(
            "langSelector"
        ).value;

    const title =
        document.getElementById(
            "title"
        );

    if (
        lang === "fr"
    ) {

        title.innerText =
            "État de service pour un brevet";
    }
    else {

        title.innerText =
            "Statement of Sea Service for a Certificate";
    }
}
