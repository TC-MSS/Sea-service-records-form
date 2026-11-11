import { getBasisDays, updateExaminerBasis } from "./calculationEngine.js";
import { validateExaminerReview } from "./validationEngine.js";

export function applyExaminerReview(voyage, input) {
  Object.assign(voyage.examinerReview, input);
  voyage.examinerReview.basisDays = getBasisDays(voyage);
  updateExaminerBasis(voyage);
  const result = validateExaminerReview(voyage);
  if (!result.valid) return result;
  voyage.examinerReview.reviewedAt = new Date().toISOString();
  return { valid: true, errors: [], voyage };
}

export const EXAMINER_LABELS = Object.freeze({
  en: { capacityVerified: "Capacity verified", specializedServiceVerified: "Specialized service verified", convertedDays: "Converted days", examinerBasis: "Examiner basis", finalAcceptedDays: "Final accepted days" },
  fr: { capacityVerified: "Fonction vérifiée", specializedServiceVerified: "Service spécialisé vérifié", convertedDays: "Jours convertis", examinerBasis: "Base de l’examinateur", finalAcceptedDays: "Jours finaux acceptés" }
});
