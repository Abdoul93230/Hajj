// ─────────────────────────────────────────────────────────────────────────────
// Règles métier sur les documents des pèlerins
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Types de documents gérés EXCLUSIVEMENT par l'agence.
 *
 * Le VISA est obtenu et déposé par l'agence : le pèlerin ne peut donc ni
 * l'envoyer, ni le modifier, ni le supprimer (contrôle appliqué à la fois dans
 * l'interface et dans les routes API — voir /api/pilgrim/documents/*).
 */
export const AGENCY_ONLY_DOC_TYPES = ["VISA"] as const;

/** Vrai si le type de document est réservé à l'agence. */
export function isAgencyOnlyDocType(type: string | null | undefined): boolean {
  if (!type) return false;
  return (AGENCY_ONLY_DOC_TYPES as readonly string[]).includes(type);
}

/** Message renvoyé par l'API quand un pèlerin tente une action interdite. */
export const AGENCY_ONLY_ERROR =
  "Ce document est géré par votre agence : vous ne pouvez pas le modifier.";