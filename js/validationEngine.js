/*
=====================================================
Validation Engine
Sea Service Records Project
Phase 3
=====================================================
*/

// =====================================================
// Main Validation Function
// =====================================================

function validateCertificateEligibility(
    certificateName,
    records,
    specialOperations
) {

    const rule =
        getCertificateRule(
            certificateName
        );

    const results = {

        valid: true,

        errors: [],

        warnings: []
    };

    if (!rule) {

        results.valid = false;

        results.errors.push(
            "Certificate rule not found."
        );

        return results;
    }

    validateSeaServiceRecords(
        records,
        rule,
        results
    );

    validateSpecialRequirements(
        specialOperations,
        rule,
        results
    );

    return results;
}

// =====================================================
// Record Validation
// =====================================================

function validateSeaServiceRecords(
    records,
    rule,
    results
) {

    records.forEach(record => {

        validateGrossTonnage(
            record,
            rule,
            results
        );

        validateEnginePower(
            record,
            rule,
            results
        );

        validateVoyageClass(
            record,
            rule,
            results
        );

        validatePosition(
            record,
            rule,
            results
        );
    });
}

// =====================================================
// Gross Tonnage
// =====================================================

function validateGrossTonnage(
    record,
    rule,
    results
) {

    if (
        rule.minimumGT &&
        Number(record.gt || 0)
        <
        rule.minimumGT
    ) {

        results.warnings.push(

            `GT requirement not met. Required: ${rule.minimumGT} GT`
        );
    }
}

// =====================================================
// Engine Power
// =====================================================

function validateEnginePower(
    record,
    rule,
    results
) {

    if (
        rule.minimumKW &&
        Number(record.kw || 0)
        <
        rule.minimumKW
    ) {

        results.warnings.push(

            `Engine power requirement not met. Required: ${rule.minimumKW} kW`
        );
    }
}

// =====================================================
// Voyage Class
// =====================================================

function validateVoyageClass(
    record,
    rule,
    results
) {

    if (
        !rule.acceptedVoyages
    ) {
        return;
    }

    if (
        !rule.acceptedVoyages.includes(
            record.voyage
        )
    ) {

        results.warnings.push(

            `Voyage class not accepted for certificate: ${record.voyage}`
        );
    }
}

// =====================================================
// Position Validation
// =====================================================

function validatePosition(
    record,
    rule,
    results
) {

    if (
        !rule.acceptedPositions
    ) {
        return;
    }

    if (
        !rule.acceptedPositions.includes(
            record.rank
        )
    ) {

        results.warnings.push(

            `Position not accepted for certificate: ${record.rank}`
        );
    }
}

// =====================================================
// Special Operations Validation
// =====================================================

function validateSpecialRequirements(
    specialOperations,
    rule,
    results
) {

    const requirements =
        rule.specialRequirements;

    if (!requirements)
        return;

    if (
        requirements.polar &&
        !specialOperations.polar
    ) {

        results.warnings.push(
            "Polar waters service required."
        );
    }

    if (
        requirements.ice &&
        !specialOperations.ice
    ) {

        results.warnings.push(
            "Ice navigation service required."
        );
    }

    if (
        requirements.oilTransfer &&
        !specialOperations.oil
    ) {

        results.warnings.push(
            "Oil transfer service required."
        );
    }

    if (
        requirements.chemicalTransfer &&
        !specialOperations.chemical
    ) {

        results.warnings.push(
            "Chemical transfer service required."
        );
    }

    if (
        requirements.lngTransfer &&
        !specialOperations.lng
    ) {

        results.warnings.push(
            "Liquefied gas transfer service required."
        );
    }

    if (
        results.warnings.length > 0
    ) {

        results.valid = false;
    }
}

// =====================================================
// Validation Status Summary
// =====================================================

function buildValidationMessage(
    validationResult
) {

    if (
        validationResult.valid
    ) {

        return {
            className:
                "status-success",

            message:
                "Certificate requirements satisfied."
        };
    }

    return {

        className:
            "status-warning",

        message:
            validationResult.warnings.join(
                "<br>"
            )
    };
}
