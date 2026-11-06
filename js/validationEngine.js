/*
=====================================================
Validation Engine
=====================================================
*/

function evaluateCertificateRequirements() {

    const certificate =
        document.getElementById("certificate").value;

    if (!certificate) {
        return;
    }

    const rule =
        getCertificateRule(certificate);

    if (!rule) {
        console.warn(
            "No rule found for",
            certificate
        );
        return;
    }

    let warnings = [];

    document
        .querySelectorAll("#recordsBody tr")
        .forEach(row => {

            const gt =
                parseInt(
                    row.querySelector(".gt")?.value || 0
                );

            const voyage =
                row.querySelector(".voyage")?.value;

            const rank =
                row.querySelector(".rank")?.value;

            /*
            GT validation
            */

            if (
                rule.minimumGT &&
                gt < rule.minimumGT
            ) {
                warnings.push(
                    `GT ${gt} is below minimum requirement of ${rule.minimumGT}`
                );
            }

            /*
            Voyage validation
            */

            if (
                voyage &&
                !rule.acceptedVoyages.includes(voyage)
            ) {

                warnings.push(
                    `${voyage} not accepted for ${certificate}`
                );

            }

            /*
            Position validation
            */

            if (
                rank &&
                !rule.acceptedPositions.includes(rank)
            ) {

                warnings.push(
                    `${rank} is not an accepted position for ${certificate}`
                );

            }

        });

    updateValidationPanel(
        warnings
    );
    function updateValidationPanel(
    warnings
) {

    const panel =
        document.getElementById(
            "statusPanel"
        );

    if (
        warnings.length === 0
    ) {

        panel.className =
            "status-success";

        panel.innerHTML =
            "Certificate requirements satisfied.";

        return;

    }

    panel.className =
        "status-warning";

    panel.innerHTML =
        warnings.join("<br>");

}


}
