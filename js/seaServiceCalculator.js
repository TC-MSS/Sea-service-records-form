function updateSpecialServiceSummary(total) {

    document.getElementById("polarDays").textContent =
        document.getElementById("polar").checked ? total : 0;

    document.getElementById("iceDays").textContent =
        document.getElementById("ice").checked ? total : 0;

    document.getElementById("oilDays").textContent =
        document.getElementById("oil").checked ? total : 0;

    document.getElementById("chemicalDays").textContent =
        document.getElementById("chemical").checked ? total : 0;

    document.getElementById("lngDays").textContent =
        document.getElementById("lng").checked ? total : 0;

    document.getElementById("lpgDays").textContent =
        document.getElementById("lpg").checked ? total : 0;

    document.getElementById("dpDays").textContent =
        document.getElementById("dp").checked ? total : 0;

    document.getElementById("offshoreDays").textContent =
        document.getElementById("offshore").checked ? total : 0;

    document.getElementById("passengerDays").textContent =
        document.getElementById("passenger").checked ? total : 0;

    document.getElementById("fishingDays").textContent =
        document.getElementById("fishing").checked ? total : 0;
}
