/*
=====================================================
Certificate Service Requirement Matrix
=====================================================
*/

export const certificateServiceRequirements = {

    /*
    =====================================================
    DECK
    =====================================================
    */

    "Master Mariner": {
        qualifyingDays: 1095,
        chiefMateDays: 365,
        unlimitedDays: 365,
        gt500Days: 365
    },

    "Master, Near Coastal": {
        qualifyingDays: 730,
        officerDays: 365,
        masterDays: 180,
        gt500Days: 365
    },

    "Master 3 000 Gross Tonnage, Near Coastal": {
        qualifyingDays: 730,
        officerDays: 365,
        gt3000Days: 365
    },

    "Master 500 Gross Tonnage, Near Coastal": {
        qualifyingDays: 730,
        officerDays: 365,
        gt500Days: 365
    },

    "Master 3 000 Gross Tonnage, Domestic": {
        qualifyingDays: 730,
        officerDays: 365,
        gt3000Days: 365
    },

    "Master 500 Gross Tonnage, Domestic": {
        qualifyingDays: 730,
        officerDays: 365,
        gt500Days: 365
    },

    "Master 150 Gross Tonnage, Domestic": {
        qualifyingDays: 365,
        officerDays: 180,
        gt150Days: 180
    },

    "Master, Limited": {
        qualifyingDays: 180
    },

    "Chief Mate": {
        qualifyingDays: 730,
        officerDays: 365,
        unlimitedDays: 365,
        gt500Days: 365
    },

    "Chief Mate, Near Coastal": {
        qualifyingDays: 730,
        officerDays: 365,
        gt500Days: 365
    },

    "Watchkeeping Mate": {
        qualifyingDays: 365,
        watchkeepingDays: 180,
        gt60Days: 180
    },

    "Watchkeeping Mate, Near Coastal": {
        qualifyingDays: 365,
        watchkeepingDays: 180,
        nc1Days: 180
    },

    "Chief Mate 500 Gross Tonnage, Domestic": {
        qualifyingDays: 365,
        officerDays: 180,
        gt500Days: 180
    },

    "Chief Mate 150 Gross Tonnage, Domestic": {
        qualifyingDays: 365,
        officerDays: 180,
        gt150Days: 180
    },

    "Chief Mate, Limited": {
        qualifyingDays: 180
    },

    /*
    =====================================================
    FISHING
    =====================================================
    */

    "Fishing Master, First Class": {
        fishingDays: 1460
    },

    "Fishing Master, Second Class": {
        fishingDays: 1095
    },

    "Fishing Master, Third Class": {
        fishingDays: 730
    },

    "Fishing Master, Fourth Class": {
        fishingDays: 365
    },

    "Certificate of Service as Master of a Fishing Vessel of Less Than 60 Gross Tonnage": {
        fishingDays: 180
    },

    /*
    =====================================================
    ENGINEERING
    =====================================================
    */

    "First-class Engineer, Motor Ship": {
        engineeringDays: 1460,
        kw3000Days: 365
    },

    "First-class Engineer, Steamship": {
        engineeringDays: 1460,
        kw3000Days: 365
    },

    "Second-class Engineer, Motor Ship": {
        engineeringDays: 1095,
        kw3000Days: 365
    },

    "Second-class Engineer, Steamship": {
        engineeringDays: 1095,
        kw3000Days: 365
    },

    "Third-class Engineer, Motor Ship": {
        engineeringDays: 730,
        kw750Days: 365
    },

    "Third-class Engineer, Steamship": {
        engineeringDays: 730,
        kw750Days: 365
    },

    "Fourth-class Engineer, Motor Ship": {
        engineeringDays: 365,
        kw750Days: 180
    },

    "Fourth-class Engineer, Steamship": {
        engineeringDays: 365,
        kw750Days: 180
    },

    "Watchkeeping Engineer, Motor-driven Fishing Vessel": {
        engineeringDays: 180
    },

    "Small Vessel Machinery Operator": {
        engineeringDays: 60
    },

    /*
    =====================================================
    STCW / PROFICIENCY
    =====================================================
    */

    "Proficiency in Survival Craft and Rescue Boats Other Than Fast Rescue Boats": {},

    "Supervisor of an Oil Transfer Operation": {
        oilTransferDays: 30
    },

    "Supervisor of an Oil Transfer Operation in Arctic Waters (North of 60° N)": {
        oilTransferDays: 30,
        polarDays: 30
    },

    "Supervisor of a Chemical Transfer Operation": {
        chemicalDays: 30
    },

    "Supervisor of a Liquefied Gas Transfer Operation": {
        lngDays: 30
    },

    "Able Seafarer": {
        qualifyingDays: 365
    },

    "Bridge Watch Rating": {
        qualifyingDays: 180
    },

    "Engine-room Rating": {
        engineeringDays: 180
    }
};
