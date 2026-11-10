/*
=====================================================
Tonnage Assessment Engine
=====================================================
*/

export class TonnageE*gine {

    assess(records) {

   *    const result = {

            *t60Days: 0,

            gt150Days* 0,

            gt500Days: 0,

  *         gt3000Days: 0
        };
*        records.forEach(record => *

            const days =
       *        Number(record.seaTimeDays *| 0);

            const gt =
    *           Number(record.gt || 0);

            if (gt >= 60)
                result.gt60Days += days;

            if (gt >= 150)
                result.gt150Days += days;

            if (gt >= 500)
                result.gt500Days += days;

            if (gt >= 3000)
                result.gt3000Days += days;
        });

        return result;
    }
}
