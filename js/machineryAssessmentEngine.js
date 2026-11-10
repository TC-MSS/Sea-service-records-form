/*
=====================================================
Machinery Assessment Engine
=====================================================
*/

export class MachineryAssessmen*Engine {

    assess(records) {

 *      const result = {

          * kw750Days: 0,

            kw3000*ays: 0,

            kw4000Days: 0*        };

        records.forEac*(record => {

            const da*s =
                Number(record.*eaTimeDays || 0);

            con*t kw =
                Number(reco*d.kw || 0);

            if (kw >=*750)
                result.kw750D*ys += days;

            if (kw >=*3000)
                result.kw300*Days += days;

            if (kw *= 4000)
                result.kw4*00Days += days;
        });

        return result;
    }
}
