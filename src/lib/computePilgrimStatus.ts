/**
 * Calcule automatiquement le pilgrimStatus selon le paiement et les dates de voyage.
 *
 * Règles :
 *  - CANCELLED           → jamais écrasé
 *  - RETOUR              → jamais écrasé (pèlerin rentré)
 *  - PARTI               → auto-avance vers RETOUR si today ≥ returnDate
 *  - VISA_OK             → auto-avance vers PARTI  si today ≥ departureDate
 *  - VISA_DEPOSE         → jamais écrasé par les paiements (statut admin)
 *  - NOUVEAU/EN_COURS/COMPLET → calculé d'après le % versé
 */
export function computePilgrimStatus(
  paid:          number,
  total:         number,
  currentStatus: string,
  opts?: { departureDate?: Date | null; returnDate?: Date | null },
): string {
  if (currentStatus === "CANCELLED") return "CANCELLED";
  if (currentStatus === "RETOUR")    return "RETOUR";

  const today = new Date();

  // Auto-avance par date (priorité sur tout sauf CANCELLED/RETOUR)
  if (currentStatus === "PARTI") {
    if (opts?.returnDate && today >= opts.returnDate) return "RETOUR";
    return "PARTI";
  }
  if (currentStatus === "VISA_OK") {
    if (opts?.departureDate && today >= opts.departureDate) return "PARTI";
    return "VISA_OK";
  }

  // Statut admin posé manuellement → ne pas écraser avec le calcul paiement
  if (currentStatus === "VISA_DEPOSE") return "VISA_DEPOSE";

  // Calcul automatique par paiement
  if (total <= 0 || paid <= 0) return "NOUVEAU";
  if (paid >= total)           return "COMPLET";
  return "EN_COURS";
}
