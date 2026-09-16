/**
 * Utilitaires et constantes SMS partagés (aucune dépendance serveur) —
 * utilisables AUSSI BIEN dans les composants client (compteur de caractères,
 * modèles, libellés) que dans le transport serveur (`src/lib/sms.ts`) et le
 * service métier (`src/lib/sms-service.ts`) qui les ré-exportent.
 */

// ─── Constantes partagées ─────────────────────────────────────────────────────

export const MAX_BULK_RECIPIENTS = 200;

export const SMS_SOURCES = ["ACCOUNT", "PAYMENT", "MANUAL"] as const;
export type SmsSource = (typeof SMS_SOURCES)[number];

export const SMS_SOURCE_LABELS: Record<SmsSource, string> = {
  ACCOUNT: "Création de compte",
  PAYMENT: "Versement",
  MANUAL: "Envoi manuel",
};

export type SmsStatus = "SENT" | "FAILED" | "SKIPPED";

/** Un destinataire : pèlerin en base (userId) ou numéro libre. */
export type SmsRecipient = {
  userId?: string | null;
  name?: string | null;
  phone?: string | null;
  /** Canal de repli : les non-Niger reçoivent le message par email. */
  email?: string | null;
};

export const SMS_STATUS_LABELS: Record<SmsStatus, string> = {
  SENT: "Envoyé",
  FAILED: "Échec",
  SKIPPED: "Non envoyé",
};

export const SMS_VARIABLES = [
  { key: "nom", label: "Nom du pèlerin" },
  { key: "agence", label: "Nom de l'agence" },
  { key: "montant", label: "Montant" },
  { key: "solde", label: "Solde restant" },
  { key: "voyage", label: "Voyage / forfait" },
  { key: "date", label: "Date de départ" },
] as const;

/** Modèles pré-écrits proposés dans la page Messages ({{variables}}). */
export const SMS_TEMPLATES: { key: string; label: string; body: string }[] = [
  {
    key: "welcome",
    label: "Bienvenue (compte créé)",
    body:
      "{{agence}} : bienvenue {{nom}} ! Votre compte pèlerin est créé. " +
      "Complétez votre dossier pour finaliser votre inscription.",
  },
  {
    key: "payment",
    label: "Versement reçu",
    body: "{{agence}} : versement de {{montant}} reçu. Reste à payer : {{solde}}.",
  },
  {
    key: "voyage",
    label: "Convocation voyage",
    body:
      "{{agence}} : votre départ est prévu le {{date}} ({{voyage}}). " +
      "Présentez-vous avec vos documents.",
  },
  {
    key: "documents",
    label: "Documents manquants",
    body:
      "{{agence}} : il manque des documents dans votre dossier ({{nom}}). " +
      "Merci de les déposer rapidement.",
  },
  {
    key: "blank",
    label: "Message libre",
    body: "",
  },
];

// ─── Fonctions partagées ──────────────────────────────────────────────────────

// Jeu de caractères GSM-7 (1 segment de 160 car.) — tout le reste (accents
// composés, arabe…) bascule en UCS-2 : 70 car. par segment, donc 2× plus cher.
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€";

/** Nombre de SMS facturés pour ce texte (0 si vide). */
export function countSmsSegments(text: string): number {
  const content = String(text ?? "");
  if (!content) return 0;

  let length = 0;
  let isGsm = true;
  for (const char of content) {
    if (GSM7.includes(char)) length += 1;
    else if (GSM7_EXT.includes(char)) length += 2;
    else {
      isGsm = false;
      break;
    }
  }

  if (!isGsm) length = Array.from(content).length;
  const single = isGsm ? 160 : 70;
  const multi = isGsm ? 153 : 67;

  return length <= single ? 1 : Math.ceil(length / multi);
}

/** Longueur facturée d'un texte (nombre de caractères GSM-7, ou UCS-2 si non-GSM). */
export function smsLength(text: string): { length: number; gsm: boolean } {
  const content = String(text ?? "");
  let length = 0;
  for (const char of content) {
    if (GSM7.includes(char)) length += 1;
    else if (GSM7_EXT.includes(char)) length += 2;
    else return { length: Array.from(content).length, gsm: false };
  }
  return { length, gsm: true };
}

/**
 * Affichage lisible d'un numéro : « +22790123456 » → « +227 90 12 34 56 ».
 * Délégué à `phone.ts` : l'espacement suit le découpage du pays (Niger, France…).
 */
export { formatPhoneDisplay as formatPhone } from "@/lib/phone";

/** « 1500000 FCFA » — espace simple : reste GSM-7 (1 seul segment). */
export function formatAmount(amount: number, currency = "FCFA"): string {
  const value = Number.isFinite(amount) ? Math.round(amount) : 0;
  const spaced = value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${spaced} ${currency}`;
}

/** Remplace les {{variables}} d'un modèle. Les valeurs absentes deviennent "". */
export function renderTemplate(
  body: string,
  vars: Record<string, string | number | null | undefined>
): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = vars[key];
    return value === null || value === undefined ? "" : String(value);
  });
}
