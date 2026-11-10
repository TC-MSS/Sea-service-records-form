/*
=====================================================
Marine Personnel Regulations
Certificate Requirement Matrix

Sections 123-172

Phase 1
Regulatory Extraction Layer
=====================================================
*/

const mprRequirementMatrix = {

    "Master Mariner": {

        section: "MPR 123",

        prerequisites: [

            "Chief Mate Certificate"
        ],

        pathways: [

            {

                name:

                "36 months OICNW",

                requirements: {

                    oicnwDays: 1095,

                    outsideGreatLakesDays: 365,

                    voyage500NMDays: 365
                }
            },

            {

                name:

                "24 months OICNW + 12 months Master/Chief Mate",

                requirements: {

                    oicnwDays: 730,

                    chiefMateMasterDays: 365,

                    outsideGreatLakesDays: 365,

                    voyage500NMDays: 365
                }
            }
        ]
    }
};
{
    oicnwDays,

    chiefMateDays,

    masterDays,

    chiefMateMasterDays,

    bridgeWatchkeepingDays,

    engineeringWatchkeepingDays,

    fishingMasterDays,

    outsideGreatLakesDays,

    greatLakesDays,

    voyage500NMDays,

    gt60Days,

    gt150Days,

    gt500Days,

    gt3000Days,

    kw750Days,

    kw3000Days,

    kw4000Days,

    nc1Days,

    nc2Days,

    unlimitedDays,

    shelteredWatersDays
}
