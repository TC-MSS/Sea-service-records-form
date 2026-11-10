/*
=====================================================
Deficiency Engine
=====================================================
*/

export function calculateDefici*ncies(

    candidate,

    requir*ments

) {

    const deficiencies*= [];

    Object.keys(
        re*uirements
    ).forEach(key => {

*       const required =
          * requirements[key];

        const*actual =
            candidate[key] || 0;

        if (
            typeof required ===
            "number"
        ) {

            if (
                actual < required
            ) {

                deficiencies.push({

                    field: key,

                    required,

                    actual,

                    missing:
                        required -
                        actual
                });
            }
        }
    });

    return {

        eligible:
            deficiencies.length === 0,

        deficiencies
    };
}
