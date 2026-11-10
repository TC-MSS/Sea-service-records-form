/*
=====================================================
Service Classification Engine
=====================================================
*/

export class ServiceClassificationEngine {

    classify(records) {

        const result = {

            totalDays: 0,

            masterDays: 0,

            chiefMateDays: 0,

            officerDays: 0,

            watchkeepingDays: 0,

            engineeringDays: 0,

            engineerOfficerDays: 0,

            chiefEngineerDays: 0,

            bridgeWatchRatingDays: 0,

            engineRoomRatingDays: 0
        };

        records.forEach(record => {

            const days =
                Number(record.seaTimeDays || 0);

            result.totalDays += days;

            const rank =
                (record.rank || "")
                .toLowerCase();

            if (rank.includes("master")) {

                result.masterDays += days;

                result.officerDays += days;
            }

            if (rank.includes("chief mate")) {

                result.chiefMateDays += days;

                result.officerDays += days;
            }

            if (
                rank.includes("mate")
            ) {

                result.officerDays += days;

                result.watchkeepingDays += days;
            }

            if (
                rank.includes(
                    "bridge watch rating"
                )
            ) {

                result.bridgeWatchRatingDays += days;
            }

            if (
                rank.includes(
                    "engineer officer"
                )
            ) {

                result.engineerOfficerDays += days;

                result.engineeringDays += days;
            }

            if (
                rank.includes(
                    "chief engineer"
                )
            ) {

                result.chiefEngineerDays += days;

                result.engineeringDays += days;
            }
        });

        return result;
    }
}
