/*
=====================================================
Certificate Rules Engine
Sea Service Records Project
Version 1
=====================================================
*/

const certificateRules = {

    /*
    ============================================
    DECK CERTIFICATES
    ============================================
    */

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

        specialRequirements: {
            polar: false,
            ice: false,
            oilTransfer: false,
            chemicalTransfer: false,
            lngTransfer: false
        }

    },

    "Master 150 GT": {

        department: "Deck",

        minimumGT: 150,

        acceptedVoyages: [
            "NC1",
            "NC2"
        ],

        acceptedPositions: [
            "Mate",
            "Chief Mate",
            "Master"
        ],

        specialRequirements: {
            polar: false,
            ice: false,
            oilTransfer: false,
            chemicalTransfer: false,
            lngTransfer: false
        }

    },

    "Master 500 GT": {

        department: "Deck",

        minimumGT: 500,

        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited"
        ],

        acceptedPositions: [
            "Mate",
            "Chief Mate",
            "Master"
        ],

        specialRequirements: {
            polar: false,
            ice: false,
            oilTransfer: false,
            chemicalTransfer: false,
            lngTransfer: false
        }

    },

    "Chief Mate Near Coastal": {

        department: "Deck",

        minimumGT: 500,

        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited"
        ],

        acceptedPositions: [
            "Mate",
            "Chief Mate"
        ],

        specialRequirements: {
            polar: false,
            ice: false,
            oilTransfer: false,
            chemicalTransfer: false,
            lngTransfer: false
        }

    },

    "Master Near Coastal": {

        department: "Deck",

        minimumGT: 500,

        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited"
        ],

        acceptedPositions: [
            "Mate",
            "Chief Mate",
            "Master"
        ],

        specialRequirements: {
            polar: false,
            ice: false,
            oilTransfer: false,
            chemicalTransfer: false,
            lngTransfer: false
        }

    },

    /*
    ============================================
    ENGINE CERTIFICATES
    ============================================
    */

    "Fourth-Class Engineer": {

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

        specialRequirements: {
            polar: false,
            ice: false,
            oilTransfer: false,
            chemicalTransfer: false,
            lngTransfer: false
        }

    },

    "Third-Class Engineer": {

        department: "Engine",

        minimumKW: 750,

        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited"
        ],

        acceptedPositions: [
            "Engineer Officer",
            "Second Engineer"
        ],

        specialRequirements: {
            polar: false,
            ice: false,
            oilTransfer: false,
            chemicalTransfer: false,
            lngTransfer: false
        }

    },

    "Second Engineer": {

        department: "Engine",

        minimumKW: 750,

        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited"
        ],

        acceptedPositions: [
            "Second Engineer",
            "Engineer Officer"
        ],

        specialRequirements: {
            polar: false,
            ice: false,
            oilTransfer: false,
            chemicalTransfer: false,
            lngTransfer: false
        }

    },

    "Chief Engineer": {

        department: "Engine",

        minimumKW: 750,

        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited"
        ],

        acceptedPositions: [
            "Chief Engineer"
        ],

        specialRequirements: {
            polar: false,
            ice: false,
            oilTransfer: false,
            chemicalTransfer: false,
            lngTransfer: false
        }

    },

    /*
    ============================================
    SPECIALIZED OPERATIONS
    ============================================
    */

    "Advanced Oil Tanker Endorsement": {

        department: "Deck",

        minimumGT: 0,

        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited"
        ],

        acceptedPositions: [
            "Mate",
            "Chief Mate",
            "Master",
            "Engineer Officer",
            "Chief Engineer"
        ],

        specialRequirements: {

            polar: false,

            ice: false,

            oilTransfer: true,

            chemicalTransfer: false,

            lngTransfer: false

        }

    },

    "Advanced Chemical Tanker Endorsement": {

        department: "Deck",

        minimumGT: 0,

        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited"
        ],

        acceptedPositions: [
            "Mate",
            "Chief Mate",
            "Master",
            "Engineer Officer",
            "Chief Engineer"
        ],

        specialRequirements: {

            polar: false,

            ice: false,

            oilTransfer: false,

            chemicalTransfer: true,

            lngTransfer: false

        }

    },

    "Advanced LNG Tanker Endorsement": {

        department: "Deck",

        minimumGT: 0,

        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited"
        ],

        acceptedPositions: [
            "Mate",
            "Chief Mate",
            "Master",
            "Engineer Officer",
            "Chief Engineer"
        ],

        specialRequirements: {

            polar: false,

            ice: false,

            oilTransfer: false,

            chemicalTransfer: false,

            lngTransfer: true

        }

    },

    "Polar Waters Endorsement": {

        department: "Deck",

        minimumGT: 0,

        acceptedVoyages: [
            "NC1",
            "NC2",
            "Unlimited"
        ],

        acceptedPositions: [
            "Mate",
            "Chief Mate",
            "Master"
        ],

        specialRequirements: {

            polar: true,

            ice: true,

            oilTransfer: false,

            chemicalTransfer: false,

            lngTransfer: false

        }

    }

};

/*
=====================================================
Helper Functions
=====================================================
*/

function getCertificateRule(certificateName) {

    return certificateRules[certificateName] || null;

}

function certificateExists(certificateName) {

    return certificateRules.hasOwnProperty(
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
        certificateRules[c].department === "Deck"
    );

}

function listEngineCertificates() {

    return Object.keys(
        certificateRules
    ).filter(c =>
        certificateRules[c].department === "Engine"
    );

}
