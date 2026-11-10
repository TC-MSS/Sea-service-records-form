function evaluateEligibility(
    certificate,
    candidate
) {

    const requirement =
        certificateServiceRequirements[
            certificate
        ];

    const deficiencies = [];

    Object.keys(
        requirement
    ).forEach(field => {

        if (
            field === "minimumGT"
        ) {
            return;
        }

        const actual =
            candidate[field] || 0;

        const required =
            requirement[field];

        if (
            actual < required
        ) {

            deficiencies.push({

                field,

                actual,

                required,

                missing:
                    required - actual
            });
        }
    });

    return {

        eligible:
            deficiencies.length === 0,

        deficiencies
    };
}
