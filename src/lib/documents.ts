// ─────────────────────────────────────────────────────────────────────────────
// Règles métier sur les documents des pèlerins
//
// ⚠️ Fichier SANS dépendance serveur (importé aussi par des composants client).
// Pour la partie qui interroge la base, voir src/lib/passport-check.ts
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

// ─── Libellé automatique ──────────────────────────────────────────────────────
//
// Le champ « Libellé » n'est plus demandé à l'utilisateur (retiré des
// formulaires agence et pèlerin) : il est généré automatiquement à partir du
// type de document au moment de l'upload. Moins de saisie, moins d'erreurs.

/** Libellé par défaut appliqué à la création selon le type de document. */
export const DOC_TYPE_DEFAULT_LABELS: Record<string, string> = {
  PASSPORT: "Passeport",
  CNI:      "Carte Nationale d'Identité",
  VISA:     "Visa",
  PHOTO:    "Photo d'identité",
  OTHER:    "Autre document",
};

/** Libellé automatique d'un document (type inconnu → « Document »). */
export function defaultDocumentLabel(type: string): string {
  return DOC_TYPE_DEFAULT_LABELS[type] ?? "Document";
}

// ─── Documents obligatoires du dossier ───────────────────────────────────────
//
// Seul le PASSEPORT est obligatoire. La carte d'identité (CNI) est FACULTATIVE
// partout : elle n'est ni exigée, ni comptée dans la progression du dossier,
// ni signalée « manquante ». Le pèlerin peut donc déposer un dossier complet
// avec son seul passeport.

/** Types de documents obligatoires (tout le reste est facultatif). */
export const REQUIRED_DOC_TYPES = ["PASSPORT"] as const;

/** Vrai si ce type de document est obligatoire (sinon il est facultatif). */
export function isRequiredDocType(type: string | null | undefined): boolean {
  if (!type) return false;
  return (REQUIRED_DOC_TYPES as readonly string[]).includes(type);
}

/** Vrai si ce type de document est facultatif (CNI, photo, autre…). */
export function isOptionalDocType(type: string | null | undefined): boolean {
  if (!type) return false;
  return !isRequiredDocType(type) && !isAgencyOnlyDocType(type);
}

// ─── Règle passeport : validité minimale de 6 mois APRÈS LE RETOUR ────────────
//
// Un passeport n'est accepté que s'il reste valide au moins 6 mois après la
// date de retour du voyage. Sinon il est « recalé » : l'upload est refusé et,
// côté agence, il ne peut pas être marqué VALID.
// La règle est appliquée côté serveur (routes d'upload / de mise à jour) et
// rappelée côté interface dans les formulaires.

/** Nombre de mois de validité exigés après la date de retour du voyage. */
export const PASSPORT_MIN_VALIDITY_MONTHS = 6;

/** Dates d'un voyage : la date de retour sert de référence à la règle. */
export type TripDates = {
  departureDate?: Date | string | null;
  returnDate?:    Date | string | null;
};

/** Code d'échec renvoyé par l'API (permet à chaque interface de traduire). */
export type PassportFailureCode = "PASSPORT_EXPIRY_MISSING" | "PASSPORT_TOO_SHORT";

export type PassportVerdict =
  | { ok: true;  requiredUntil: Date | null }
  | { ok: false; code: PassportFailureCode; requiredUntil: Date; message: string };

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Ajoute des mois à une date en conservant le jour (gère les fins de mois). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

/** Date de retour retenue pour la règle : retour de l'offre, sinon départ. */
export function resolveTripReturnDate(trip?: TripDates | null): Date | null {
  return toDate(trip?.returnDate) ?? toDate(trip?.departureDate);
}

/** Échéance minimale exigée pour le passeport : retour du voyage + 6 mois. */
export function requiredPassportExpiry(trip?: TripDates | null): Date | null {
  const retour = resolveTripReturnDate(trip);
  if (!retour) return null;
  return addMonths(retour, PASSPORT_MIN_VALIDITY_MONTHS);
}

/** Date au format 12/03/2026 (affichée dans les messages et l'interface). */
export function formatFrDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Clé de comparaison par JOUR calendaire (local, comme l'affichage de l'app).
 * Comparer les dates au jour près évite qu'un passeport expirant exactement le
 * jour requis soit recalé à cause de l'heure.
 */
function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * Vérifie qu'un passeport reste valide 6 mois après le retour du voyage.
 *
 * - Si le voyage n'a pas de date de retour exploitable, la règle ne peut pas
 *   être évaluée : le document est accepté (`requiredUntil: null`).
 * - Sans date d'expiration, le passeport est refusé : la conformité doit être
 *   prouvée.
 */
export function checkPassportValidity(
  expiresAt: Date | string | null | undefined,
  trip?: TripDates | null,
): PassportVerdict {
  const requiredUntil = requiredPassportExpiry(trip);
  if (!requiredUntil) return { ok: true, requiredUntil: null };

  const expiry = toDate(expiresAt);
  if (!expiry) {
    return {
      ok: false,
      code: "PASSPORT_EXPIRY_MISSING",
      requiredUntil,
      message:
        `Passeport recalé : la date d'expiration est obligatoire. ` +
        `Le passeport doit rester valide jusqu'au ${formatFrDate(requiredUntil)} ` +
        `(6 mois après le retour du voyage).`,
    };
  }

  if (dayKey(expiry) < dayKey(requiredUntil)) {
    return {
      ok: false,
      code: "PASSPORT_TOO_SHORT",
      requiredUntil,
      message:
        `Passeport recalé : il doit rester valide jusqu'au ${formatFrDate(requiredUntil)} ` +
        `(6 mois après le retour du voyage), or celui-ci expire le ${formatFrDate(expiry)}.`,
    };
  }

  return { ok: true, requiredUntil };
}