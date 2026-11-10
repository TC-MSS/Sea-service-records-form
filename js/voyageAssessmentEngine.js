/*
=====================================================
Voyage Assessment Engine
=====================================================
*/

export class VoyageAssessmentEngine {

    assess(records) {

        const result = {

            nc1Days: 0,

            nc2Days: 0,

            unlimitedDays: 0,

            shelteredDays: 0
        };

        records.forEach(record => {

            const days =
                Number(record.seaTimeDays || 0);

            switch (
                record.voyage
            ) {

                case "NC1":

                    result.nc1Days += days;

                    break;

                case "NC2":

                    result.nc2Days += days;

                    break;

                case "Unlimited":

                    result.unlimitedDays += days;

                    break;

                case "Sheltered Waters":

                    result.shelteredDays += days;

                    break;
            }
        });

        return result;
    }
}
