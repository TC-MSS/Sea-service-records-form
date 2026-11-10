export class TP2293CalculationEngine {

    calculateOfficialService(
        onboardDays,
        seaDays,
        watchHours
    ) {

        const watchTable = {

            8: {
                onboardFactor: 1,
                seaFactor: 1.5
            },

            9: {
                onboardFactor: 1.125,
                seaFactor: 1.688
            },

            10: {
                onboardFactor: 1.25,
                seaFactor: 1.875
            },

            11: {
                onboardFactor: 1.375,
                seaFactor: 2.063
            },

            12: {
                onboardFactor: 1.5,
                seaFactor: 2.25
            }
        };

        const factor =
            watchTable[
                Number(
                    watchHours
                )
            ];

        if (!factor)
            return 0;

        return Math.round(

            Math.min(

                onboardDays *
                factor.onboardFactor,

                seaDays *
                factor.seaFactor
            )
        );
    }
}
