// ─────────────────────────────────────────────────────────────────────────────
// Liens de contact dérivés du branding du tenant — PURES (serveur + client).
//
// Règle multitenant : un contact absent = le lien n'est PAS rendu (null).
// JAMAIS de numéro « par défaut » : un tenant qui n'a pas configuré son
// WhatsApp ne doit pas afficher celui d'une autre agence.
// ─────────────────────────────────────────────────────────────────────────────

/** Chiffres uniquement (« +227 90 12 34 56 » → « 22790123456 »), sinon null. */
export function contactDigits(raw?: string | null): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits ? digits : null;
}

/** Lien wa.me (« 22790123456 » → https://wa.me/22790123456[?text=…]), sinon null. */
export function waLink(raw?: string | null, text?: string): string | null {
  const digits = contactDigits(raw);
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Lien tel: normalisé (« +227 90 12 34 56 » → tel:+22790123456), sinon null. */
export function telLink(raw?: string | null): string | null {
  const digits = contactDigits(raw);
  return digits ? `tel:+${digits}` : null;
}
