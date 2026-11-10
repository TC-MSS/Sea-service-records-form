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

       const totals = {

        totalOnboardDays: 0,
        totalQualifyingDays: 0,

        service8Hour: 0,
        service12Hour: 0,

        captainDays: 0,
        chiefOfficerDays: 0,
        officerDays: 0,

        gt500Days: 0,
        gt3000Days: 0,

        nearCoastalDays: 0,
        unlimitedDays: 0
    };

    records.forEach(record => {

        const result =
            this.calculateQualifyingDays(record);

        totals.totalOnboardDays +=
            result.onboardDays;

        totals.totalQualifyingDays +=
            result.qualifyingDays;

        const qualifyingDays =
            result.qualifyingDays;

        const watchHours =
            Number(record.watchHours);

        if (watchHours >= 12) {

            totals.service12Hour +=
                qualifyingDays;

        } else {

            totals.service8Hour +=
                qualifyingDays;
        }

        const rank =
            (record.rank || '')
            .toLowerCase();

        if (rank.includes('captain')) {

            totals.captainDays +=
                qualifyingDays;
        }

        if (
            rank.includes('chief officer')
        ) {

            totals.chiefOfficerDays +=
                qualifyingDays;
        }

        if (
            rank.includes('officer')
        ) {

            totals.officerDays +=
                qualifyingDays;
        }

        const gt =
            Number(record.grossTonnage || 0);

        if (gt >= 500) {

            totals.gt500Days +=
                qualifyingDays;
        }

        if (gt >= 3000) {

            totals.gt3000Days +=
                qualifyingDays;
        }

        const voyage =
            (record.voyageClass || '')
            .toLowerCase();

        if (
            voyage.includes('near')
        ) {

            totals.nearCoastalDays +=
                qualifyingDays;
        }

        if (
            voyage.includes('unlimited')
        ) {

            totals.unlimitedDays +=
                qualifyingDays;
        }
    });

    return totals;
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

    service8Hour:
        totals.service8Hour,

    service12Hour:
        totals.service12Hour,

    captainDays:
        totals.captainDays,

    chiefOfficerDays:
        totals.chiefOfficerDays,

    officerDays:
        totals.officerDays,

    gt500Days:
        totals.gt500Days,

    gt3000Days:
        totals.gt3000Days,

    nearCoastalDays:
        totals.nearCoastalDays,

    unlimitedDays:
        totals.unlimitedDays,

    overlapCount:
        overlaps.length,

    overlaps
};
       }
