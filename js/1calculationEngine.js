export function inclusiveDays(embarkationDate, disembarkationDate) {
  if (!embarkationDate || !disembarkationDate) return null;
  const start = new Date(`${embarkationDate}T00:00:00`);
  const end = new Date(`${disembarkationDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null;
  return Math.floor((end - start) / 86400000) + 1;
}

export function updateCandidateDays(voyage) {
  const daysOnBoard = inclusiveDays(voyage.dates.embarkationDate, voyage.dates.disembarkationDate);
  const entered = voyage.dates.daysAtSeaEntered;
  voyage.dates.daysOnBoard = daysOnBoard;
  voyage.dates.daysAtSeaEffective = entered === null || entered === "" ? daysOnBoard : Number(entered);
  voyage.dates.daysAtSeaDifferent = entered !== null && entered !== "" && Number(entered) !== daysOnBoard;
  return voyage;
}

export function getBasisDays(voyage) {
  switch (voyage.examinerReview.examinerBasis) {
    case "DAYS_ON_BOARD": return voyage.dates.daysOnBoard;
    case "DAYS_AT_SEA": return voyage.dates.daysAtSeaEffective;
    case "CONVERTED_DAYS": return voyage.calculation.convertedDays;
    default: return null;
  }
}

export function updateExaminerBasis(voyage) {
  voyage.examinerReview.basisDays = getBasisDays(voyage);
  const accepted = voyage.examinerReview.finalAcceptedDays;
  voyage.examinerReview.adjustmentRequired = accepted !== null && (voyage.examinerReview.examinerBasis === "MANUAL_DETERMINATION" || accepted !== voyage.examinerReview.basisDays);
  return voyage;
}

export function reserveConvertedDays(voyage) {
  voyage.calculation.conversionStatus = "NOT_CALCULATED";
  voyage.calculation.conversionRate = null;
  voyage.calculation.convertedDays = null;
  return voyage;
}
