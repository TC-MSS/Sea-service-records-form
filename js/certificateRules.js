/*
=====================================================
Certificate Rules Engine
Sea Service Records Project
Phase 3
=====================================================
*/

const certificateRules = {

    /*
    =====================================================
    DECK CERTIFICATES
    =====================================================
    */

    "Master Mariner": {
        department: "Deck",
        minimumGT: 500,
        acceptedVoyages: ["Unlimited"],
        acceptedPositions: ["Chief Mate", "Master"],
        specialRequirements: {}
    },

    "Master, Near Coastal": {
        department: "Deck",
        minimumGT: 500,
        acceptedVoyages: ["NC1", "NC2"],
        acceptedPositions: ["Mate", "Chief Mate", "Master"],
        specialRequirements: {}
    },

    "Master 3 000 Gross Tonnage, Near Coastal": {
        department: "Deck",
        minimumGT: 3000,
        acceptedVoyages: ["NC1", "NC2"],
        acceptedPositions: ["Chief Mate", "Master"],
        specialRequirements: {}
    },

    "Master 500 Gross Tonnage, Near Coastal": {
        department: "Deck",
        minimumGT: 500,
        acceptedVoyages: ["NC1", "NC2"],
        acceptedPositions: ["Mate", "Chief Mate", "Master"],
        specialRequirements: {}
    },

    "Master 3 000 Gross Tonnage, Domestic": {
        department: "Deck",
        minimumGT: 3000,
        acceptedVoyages: ["NC1", "NC2"],
        acceptedPositions: ["Chief Mate", "Master"],
        specialRequirements: {}
    },

    "Master 500 Gross Tonnage, Domestic": {
        department: "Deck",
        minimumGT: 500,
        acceptedVoyages: ["NC1", "NC2"],
        acceptedPositions: ["Mate", "Chief Mate", "Master"],
        specialRequirements: {}
    },

    "Master 150 Gross Tonnage, Domestic": {
        department: "Deck",
        minimumGT: 150,
        acceptedVoyages: ["NC1", "NC2"],
        acceptedPositions: ["Mate", "Chief Mate", "Master"],
        specialRequirements: {}
    },

    "Master, Limited": {
        department: "Deck",
        minimumGT: 0,
        acceptedVoyages: ["Sheltered Waters", "NC2"],
        acceptedPositions: ["Mate", "Master"],
        specialRequirements: {}
    },

    "Chief Mate": {
        department: "Deck",
        minimumGT: 500,
        acceptedVoyages: ["Unlimited"],
        acceptedPositions: ["Mate", "Chief Mate"],
        specialRequirements: {}
    },

    "Chief Mate, Near Coastal": {
        department: "Deck",
        minimumGT: 500,
        acceptedVoyages: ["NC1", "NC2"],
        acceptedPositions: ["Mate", "Chief Mate"],
        specialRequirements: {}
    },

    "Watchkeeping Mate": {
        department: "Deck",
        minimumGT: 60,
        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited"
        ],
        acceptedPositions: [
            "Deck Cadet",
            "Bridge Watch Rating",
            "Able Seafarer Deck"
        ],
        specialRequirements: {}
    },

    "Watchkeeping Mate, Near Coastal": {
        department: "Deck",
        minimumGT: 60,
        acceptedVoyages: [
            "NC1",
            "NC2"
        ],
        acceptedPositions: [
            "Deck Cadet",
            "Bridge Watch Rating",
            "Able Seafarer Deck"
        ],
        specialRequirements: {}
    },

    "Chief Mate 500 Gross Tonnage, Domestic": {
        department: "Deck",
        minimumGT: 500,
        acceptedVoyages: ["NC1", "NC2"],
        acceptedPositions: ["Mate", "Chief Mate"],
        specialRequirements: {}
    },

    "Chief Mate 150 Gross Tonnage, Domestic": {
        department: "Deck",
        minimumGT: 150,
        acceptedVoyages: ["NC1", "NC2"],
        acceptedPositions: ["Mate", "Chief Mate"],
        specialRequirements: {}
    },

    "Chief Mate, Limited": {
        department: "Deck",
        minimumGT: 0,
        acceptedVoyages: ["Sheltered Waters", "NC2"],
        acceptedPositions: ["Mate", "Chief Mate"],
        specialRequirements: {}
    },

    /*
    =====================================================
    FISHING CERTIFICATES
    =====================================================
    */

    "Fishing Master, First Class": {
        department: "Fishing"
    },

    "Fishing Master, Second Class": {
        department: "Fishing"
    },

    "Fishing Master, Third Class": {
        department: "Fishing"
    },

    "Fishing Master, Fourth Class": {
        department: "Fishing"
    },

    "Certificate of Service as Master of a Fishing Vessel of Less Than 60 Gross Tonnage": {
        department: "Fishing"
    },

    /*
    =====================================================
    ENGINEER CERTIFICATES
    =====================================================
    */

    "First-class Engineer, Motor Ship": {
        department: "Engine",
        minimumKW: 750,
        acceptedVoyages: ["NC1", "NC2", "Unlimited"],
        acceptedPositions: [
            "Chief Engineer",
            "Engineer Officer"
        ],
        specialRequirements: {}
    },

    "First-class Engineer, Steamship": {
        department: "Engine",
        minimumKW: 750,
        acceptedVoyages: ["NC1", "NC2", "Unlimited"],
        acceptedPositions: [
            "Chief Engineer",
            "Engineer Officer"
        ],
        specialRequirements: {}
    },

    "Second-class Engineer, Motor Ship": {
        department: "Engine",
        minimumKW: 750,
        acceptedVoyages: ["NC1", "NC2", "Unlimited"],
        acceptedPositions: [
            "Second Engineer",
            "Engineer Officer"
        ],
        specialRequirements: {}
    },

    "Second-class Engineer, Steamship": {
        department: "Engine",
        minimumKW: 750,
        acceptedVoyages: ["NC1", "NC2", "Unlimited"],
        acceptedPositions: [
            "Second Engineer",
            "Engineer Officer"
        ],
        specialRequirements: {}
    },

    "Third-class Engineer, Motor Ship": {
        department: "Engine",
        minimumKW: 750,
        acceptedVoyages: ["NC1", "NC2", "Unlimited"],
        acceptedPositions: [
            "Engineer Officer"
        ],
        specialRequirements: {}
    },

    "Third-class Engineer, Steamship": {
        department: "Engine",
        minimumKW: 750,
        acceptedVoyages: ["NC1", "NC2", "Unlimited"],
        acceptedPositions: [
            "Engineer Officer"
        ],
        specialRequirements: {}
    },

    "Fourth-class Engineer, Motor Ship": {
        department: "Engine",
        minimumKW: 750,
        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited",
            "Sheltered Waters"
        ],
        acceptedPositions: [
            "Engineer Cadet",
            "Engineer Officer"
        ],
        specialRequirements: {}
    },

    "Fourth-class Engineer, Steamship": {
        department: "Engine",
        minimumKW: 750,
        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited",
            "Sheltered Waters"
        ],
        acceptedPositions: [
            "Engineer Cadet",
            "Engineer Officer"
        ],
        specialRequirements: {}
    },

    "Watchkeeping Engineer, Motor-driven Fishing Vessel": {
        department: "Engine"
    },

    "Small Vessel Machinery Operator": {
        department: "Engine"
    },

    /*
    =====================================================
    PROFICIENCY CERTIFICATES
    =====================================================
    */

    "Proficiency in Survival Craft and Rescue Boats Other Than Fast Rescue Boats": {
        department: "STCW"
    },

    "Supervisor of an Oil Transfer Operation": {
        department: "STCW",
        specialRequirements: {
            oilTransfer: true
        }
    },

    "Supervisor of an Oil Transfer Operation in Arctic Waters (North of 60° N)": {
        department: "STCW",
        specialRequirements: {
            oilTransfer: true,
            polar: true
        }
    },

    "Supervisor of a Chemical Transfer Operation": {
        department: "STCW",
        specialRequirements: {
            chemicalTransfer: true
        }
    },

    "Supervisor of a Liquefied Gas Transfer Operation": {
        department: "STCW",
        specialRequirements: {
            lngTransfer: true
        }
    },

    "Able Seafarer": {
        department: "Deck"
    },

    "Bridge Watch Rating": {
        department: "Deck"
    },

    "Engine-room Rating": {
        department: "Engine"
    }
};

/*
=====================================================
Helper Functions
=====================================================
*/

function getCertificateRule(
    certificateName
) {
    return certificateRules[
        certificateName
    ] || null;
}

function certificateExists(
    certificateName
) {
    return Object.prototype.hasOwnProperty.call(
        certificateRules,
        certificateName
    );
}

function listCertificates() {
    return Object.keys(
        certificateRules
    );
}

function listDeckCertificates() {
    return Object.keys(
        certificateRules
    ).filter(c =>
        certificateRules[c]
            .department === "Deck"
    );
}

function listEngineCertificates() {
    return Object.keys(
        certificateRules
    ).filter(c =>
        certificateRules[c]
            .department === "Engine"
    );
}

function listFishingCertificates() {
    return Object.keys(
        certificateRules
    ).filter(c =>
        certificateRules[c]
            .department === "Fishing"
    );
}

function listStcwCertificates() {
    return Object.keys(
        certificateRules
    ).filter(c =>
        certificateRules[c]
            .department === "STCW"
    );
}
