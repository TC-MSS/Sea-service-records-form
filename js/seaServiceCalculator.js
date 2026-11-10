/**
 * Sea Service Calculator
 * TP2293 / EXN2 calculations
 */

export class SeaServiceCalculator {

    calculateOnboardDays(startDate, endDate) {

        const start = new Date(startDate);
        const end = new Date(endDate);

        const msPerDay = 86400000;

        return Math.max(
            0,
            Math.floor((end - start) / msPerDay)
        );
    }

    calculateQualifyingDays(record) {

        const onboardDays =
            this.calculateOnboardDays(
                record.engagementDate,
                record.dischargeDate
            );

        const seaTime =
            Number(record.seaTimeDays || 0);

        let qualifyingDays = 0;

        switch (Number(record.watchHours)) {

            case 8:

                qualifyingDays =
                    Math.min(
                        onboardDays,
                        seaTime * 1.5
                    );

                break;

            case 9:

                qualifyingDays =
                    Math.min(
                        onboardDays * 1.125,
                        seaTime * 1.688
                    );

                break;

            case 10:

                qualifyingDays =
                    Math.min(
                        onboardDays * 1.25,
                        seaTime * 1.875
                    );

                break;

            case 11:

                qualifyingDays =
                    Math.min(
                        onboardDays * 1.375,
                        seaTime * 2.063
                    );

                break;

            case 12:

                qualifyingDays =
                    Math.min(
                        onboardDays * 1.5,
                        seaTime * 2.25
                    );

                break;

            default:

                qualifyingDays = onboardDays;
        }

        return {
            onboardDays,
            qualifyingDays:
                Math.round(qualifyingDays)
        };
    }

    detectOverlaps(records) {

        const overlaps = [];

        for (let i = 0; i < records.length; i++) {

            for (
                let j = i + 1;
                j < records.length;
                j++
            ) {

                const a = records[i];
                const b = records[j];

                if (
                    new Date(a.engagementDate)
                        <= new Date(b.dischargeDate)
                    &&
                    new Date(b.engagementDate)
                        <= new Date(a.dischargeDate)
                ) {

                    overlaps.push({
                        record1: i,
                        record2: j
                    });
                }
            }
        }

        return overlaps;
    }

    calculateTotals(records) {

        let totalOnboardDays = 0;
        let totalQualifyingDays = 0;

        records.forEach(record => {

            const result =
                this.calculateQualifyingDays(
                    record
                );

            totalOnboardDays +=
                result.onboardDays;

            totalQualifyingDays +=
                result.qualifyingDays;
        });

        return {
            totalOnboardDays,
            totalQualifyingDays
        };
    }

    buildSummary(records) {

        const totals =
            this.calculateTotals(records);

        const overlaps =
            this.detectOverlaps(records);

        return {

            totalRecords:
                records.length,

            totalOnboardDays:
                totals.totalOnboardDays,

            totalQualifyingDays:
                totals.totalQualifyingDays,

            overlapCount:
                overlaps.length,

            overlaps
        };
    }
}
