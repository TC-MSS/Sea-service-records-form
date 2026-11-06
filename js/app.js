// =====================================================
// Sea Service Record Application
// Phase 1
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    addRecord();

    restoreSavedRecord();

    document
        .getElementById("langSelector")
        .addEventListener("change", switchLanguage);

});

// =====================================================
// Add New Voyage Row
// =====================================================

function addRecord() {

    const tbody =
        document.getElementById("recordsBody");

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
<select class="watch">
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
// Remove Row
// =====================================================

function deleteRow(button) {

    const row =
        button.closest("tr");

    row.remove();

    calculateTotal();

}

// =====================================================
// Calculate Service
// =====================================================

function calculateTotal() {

    let totalDays = 0;

    let warnings = [];

    const rows =
        document.querySelectorAll(
            "#recordsBody tr"
        );

    rows.forEach(row => {

        const embark =
            row.querySelector(".embark").value;

        const disembark =
            row.querySelector(".disembark").value;

        if (!embark || !disembark)
            return;

        const start =
            new Date(embark);

        const end =
            new Date(disembark);

        if (end < start) {

            warnings.push(
                "Disembarkation date before embarkation date."
            );

            row.querySelector(
                ".daysCell"
            ).textContent = "0";

            return;

        }

        const days =
            Math.floor(
                (end - start) /
                (1000 * 60 * 60 * 24)
            ) + 1;

        row.querySelector(
            ".daysCell"
        ).textContent = days;

        totalDays += days;

    });

    document.getElementById(
        "totalDays"
    ).textContent = totalDays;

    document.getElementById(
        "acceptedDays"
    ).textContent = totalDays;

    updateSpecialServiceSummary(
        totalDays
    );

    updateStatus(
        warnings
    );

    evaluateCertificateRequirements();
}

// =====================================================
// Status Panel
// =====================================================

function updateStatus(warnings) {

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
// Summary
// =====================================================

function updateSpecialServiceSummary(
    total
) {

    document.getElementById(
        "polarDays"
    ).textContent =
        document.getElementById(
            "polar"
        ).checked ? total : 0;

    document.getElementById(
        "iceDays"
    ).textContent =
        document.getElementById(
            "ice"
        ).checked ? total : 0;

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

        voyages: voyages,

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
// Restore Saved Record
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
// Export JSON
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
// Language Switching
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
