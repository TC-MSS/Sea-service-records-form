/* Examiner terminology migration for examiner.html. */
(function () {
    "use strict";
    const replacements = {
        "Position verified": "Capacity verified",
        "Sea service verified": "Specialized service verified",
        "Poste vérifié": "Fonction vérifiée",
        "Service en mer vérifié": "Service spécialisé vérifié"
    };
    function updateLabels() {
        document.querySelectorAll("label, th, td, span, p, h1, h2, h3, option, button").forEach((element) => {
            const value = element.textContent.trim();
            if (replacements[value]) element.textContent = replacements[value];
        });
        const position = document.getElementById("positionVerified") || document.querySelector('[name="positionVerified"]');
        if (position) { position.id = "capacityVerified"; position.name = "capacityVerified"; }
        const service = document.getElementById("seaServiceVerified") || document.querySelector('[name="seaServiceVerified"]');
        if (service) { service.id = "specializedServiceVerified"; service.name = "specializedServiceVerified"; }
    }
    window.normalizeExaminerAssessment = function (data) {
        return Object.assign({}, data, {
            capacityVerified: data.capacityVerified ?? data.positionVerified ?? false,
            specializedServiceVerified: data.specializedServiceVerified ?? data.seaServiceVerified ?? false
        });
    };
    document.addEventListener("DOMContentLoaded", updateLabels);
}());
