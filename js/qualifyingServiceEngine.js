/*
=====================================================
TP2293 Qualifying Service
=====================================================
*/

export class QualifyingServiceE*gine {

    calculate(
        onb*ardDays,
        underwayDays,
   *    watchHours
    ) {

        if*(
            Number(watchHours) =*= 12
        ) {

            retu*n Math.round(

                Math.min(

                    onboardDays * 1.5,

                    underwayDays * 2.25
                )
            );
        }

        return Math.round(

            Math.min(

                onboardDays,

                underwayDays * 1.5
            )
        );
    }
}
