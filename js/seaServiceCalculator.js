/*
=====================================================
Sea Service Calculator
Phase 3
=====================================================
*/

function calculateCreditedService(days, watchHours) {

    if (!days) {
        return 0;
    }

    /*
    Basic model

    8-hour watch
    credit = 1 x sea service

    12-hour watch
    credit = 1.5 x sea service

    Will be expanded later
    with TP2293 logic.
    */

    if (parseInt(watchHours) === 12) {

        return Math.round(
            days * 1.5
        );

    }

    return days;

}

function calculateVoyageDays(
    embarkDate,
    disembarkDate
) {

    if (
        !embarkDate ||
        !disembarkDate
    ) {
        return 0;
    }

    const start =
        new Date(
            embarkDate
        );

    const end =
        new Date(
            disembarkDate
        );

    if (end < start) {

        return 0;

    }

    return Math.floor(
        (end - start) /
        (1000 * 60 * 60 * 24)
    ) + 1;

}ked ? total : 0;
}
