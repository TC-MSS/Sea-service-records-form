/**
 * Reference lists (code, English, French) — copied from the production js/app.js
 * so the examiner page can display candidate codes in either language.
 * Keep in sync with js/app.js until the lists move to data/*.json.
 */
export const CAPACITIES = [
    ["MASTER", "Master", "Capitaine"], ["CHIEF_MATE", "Chief Mate", "Premier officier de pont"],
    ["MATE", "Mate in Charge of a Watch", "Officier de pont en charge du quart à la passerelle"], ["SUPERNUMERARY_MATE", "Supernumerary Mate", "Officier de pont surnuméraire"],
    ["ABLE_SEAFARER_DECK", "Able Seafarer Deck", "Matelot qualifié Pont"], ["BRIDGE_WATCH_RATING", "Bridge Watch Rating", "Matelot de quart à la passerelle"],
    ["DECK_CADET", "Deck Cadet", "Élève-officier de pont"],
    ["CHIEF_ENGINEER", "Chief Engineer", "Chef mécanicien"], ["SECOND_ENGINEER", "Second Engineer", "Second mécanicien"],
    ["ENGINEER_OFFICER", "Engineer Officer", "Officier mécanicien"], ["ENGINE_ROOM_RATING", "Engine-room Rating", "Matelot de la salle des machines"],
    ["ENGINEER_CADET", "Engineer Cadet", "Élève-officier mécanicien"]
];

export const VESSEL_TYPES = [
    ["AIR_CUSHION", "Air cushion vessel", "Aéroglisseur"], ["BARGE", "Barge", "Chaland"],
    ["BULK_CARRIER", "Bulk carrier", "Vraquier"], ["CARGO", "Cargo vessel", "Bâtiment de charge"],
    ["CHEMICAL_TANKER", "Chemical tanker", "Bâtiment-citerne pour produits chimiques"], ["CONTAINER", "Container vessel", "Porte-conteneurs"],
    ["DREDGER", "Dredger", "Drague"], ["FERRY", "Ferry", "Traversier"], ["FISHING", "Fishing vessel", "Bâtiment de pêche"],
    ["GAS_TANKER", "Gas tanker", "Bâtiment-citerne pour gaz"], ["GENERAL_CARGO", "General cargo vessel", "Bâtiment de marchandises diverses"],
    ["HIGH_SPEED", "High-speed craft", "Engin à grande vitesse"], ["MOU", "Mobile offshore unit", "Unité mobile au large"],
    ["OIL_TANKER", "Oil tanker", "Pétrolier"], ["PASSENGER", "Passenger vessel", "Bâtiment à passagers"],
    ["PASSENGER_SUBMERSIBLE", "Passenger submersible craft", "Engin submersible à passagers"], ["RORO", "Ro-ro vessel", "Roulier"],
    ["SAIL_TRAINING", "Sail training vessel", "Voilier-école"], ["SAILING", "Sailing vessel", "Voilier"],
    ["SUPPLY", "Supply vessel", "Bâtiment de ravitaillement"], ["TUG", "Tug", "Remorqueur"],
    ["WIG", "Wing-in-ground craft", "Engin à effet de sol"], ["OTHER", "Other", "Autre"]
];

export const CERTIFICATES = [
    ["MASTER_MARINER", "Master Mariner", "Capitaine au long cours"], ["MASTER_NC", "Master, Near Coastal", "Capitaine, à proximité du littoral"],
    ["MASTER_3000_NC", "Master 3 000 Gross Tonnage, Near Coastal", "Capitaine, jauge brute de 3 000, à proximité du littoral"],
    ["MASTER_500_NC", "Master 500 Gross Tonnage, Near Coastal", "Capitaine, jauge brute de 500, à proximité du littoral"],
    ["MASTER_3000_DOM", "Master 3 000 Gross Tonnage, Domestic", "Capitaine, jauge brute de 3 000, navigation intérieure"],
    ["MASTER_500_DOM", "Master 500 Gross Tonnage, Domestic", "Capitaine, jauge brute de 500, navigation intérieure"],
    ["MASTER_150_DOM", "Master 150 Gross Tonnage, Domestic", "Capitaine, jauge brute de 150, navigation intérieure"],
    ["MASTER_LIMITED", "Master, Limited", "Capitaine, avec restrictions"], ["CHIEF_MATE", "Chief Mate", "Premier officier de pont"],
    ["CHIEF_MATE_NC", "Chief Mate, Near Coastal", "Premier officier de pont, à proximité du littoral"],
    ["WATCHKEEPING_MATE", "Watchkeeping Mate", "Officier de pont de quart"], ["WATCHKEEPING_MATE_NC", "Watchkeeping Mate, Near Coastal", "Officier de pont de quart, à proximité du littoral"],
    ["FISHING_1", "Fishing Master, First Class", "Capitaine de pêche, première classe"], ["FISHING_2", "Fishing Master, Second Class", "Capitaine de pêche, deuxième classe"],
    ["FISHING_3", "Fishing Master, Third Class", "Capitaine de pêche, troisième classe"], ["FISHING_4", "Fishing Master, Fourth Class", "Capitaine de pêche, quatrième classe"],
    ["ENGINEER_1_MOTOR", "First-class Engineer, Motor Ship", "Mécanicien de première classe, navire à moteur"],
    ["ENGINEER_1_STEAM", "First-class Engineer, Steamship", "Mécanicien de première classe, navire à vapeur"],
    ["ENGINEER_2_MOTOR", "Second-class Engineer, Motor Ship", "Mécanicien de deuxième classe, navire à moteur"],
    ["ENGINEER_2_STEAM", "Second-class Engineer, Steamship", "Mécanicien de deuxième classe, navire à vapeur"],
    ["ENGINEER_3_MOTOR", "Third-class Engineer, Motor Ship", "Mécanicien de troisième classe, navire à moteur"],
    ["ENGINEER_3_STEAM", "Third-class Engineer, Steamship", "Mécanicien de troisième classe, navire à vapeur"],
    ["ENGINEER_4_MOTOR", "Fourth-class Engineer, Motor Ship", "Mécanicien de quatrième classe, navire à moteur"],
    ["ENGINEER_4_STEAM", "Fourth-class Engineer, Steamship", "Mécanicien de quatrième classe, navire à vapeur"],
    ["WK_ENGINEER_FISHING", "Watchkeeping Engineer, Motor-driven Fishing Vessel", "Mécanicien de quart, bâtiment de pêche à moteur"],
    ["SVMO", "Small Vessel Machinery Operator", "Opérateur des machines de petits bâtiments"],
    ["ABLE_SEAFARER", "Able Seafarer", "Matelot qualifié"], ["BRIDGE_WATCH_RATING", "Bridge Watch Rating", "Matelot de quart à la passerelle"],
    ["ENGINE_ROOM_RATING", "Engine-room Rating", "Matelot de la salle des machines"]
];

export const PROPULSION = [["MOTOR", "Motor", "Moteur"], ["STEAM", "Steam", "Vapeur"], ["DIESEL_ELECTRIC", "Diesel-electric", "Diesel-électrique"], ["OTHER", "Other", "Autre"]];

export const VOYAGE_CLASSES = [["NC1", "NC1", "PN1"], ["NC2", "NC2", "PN2"], ["UNLIMITED", "Unlimited", "Illimité"], ["SHELTERED", "Sheltered Waters", "Eaux abritées"]];

export function labelFor(list, code, language = "en") {
  const item = list.find(([value]) => value === code);
  return item ? (language === "fr" ? item[2] : item[1]) : (code || "");
}
