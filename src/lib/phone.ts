// ─────────────────────────────────────────────────────────────────────────────
// Téléphones : indicatifs internationaux + formatage visuel par pays.
//
// PARTAGÉ (aucune dépendance serveur) par :
//   · PhoneInput (saisie : sélecteur d'indicatif + espacement national)
//   · les affichages (formatPhoneDisplay)
//   · le module SMS (isNigerNumber : les SMS ne partent QUE vers le Niger,
//     les autres canaux passent par l'email — voir sms-service.ts)
//
// Le stockage en base est TOUJOURS au format E.164 compact : "+22790123456".
// ─────────────────────────────────────────────────────────────────────────────

export type PhoneCountry = {
  /** Nom français (affiché dans le sélecteur). */
  name: string;
  /** Indicatif sans « + ». */
  dial: string;
  /** Drapeau emoji. */
  flag: string;
  /** Découpage visuel du numéro national (chiffres par groupe). */
  groups: number[];
};

/** Le Niger en premier : c'est le pays des SMS (lancement LAfricaMobile). */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = [
  { name: "Niger",           dial: "227", flag: "🇳🇪", groups: [2, 2, 2, 2] },
  { name: "Sénégal",         dial: "221", flag: "🇸🇳", groups: [1, 2, 2, 2, 2] },
  { name: "Mali",            dial: "223", flag: "🇲🇱", groups: [2, 2, 2, 2] },
  { name: "Côte d'Ivoire",   dial: "225", flag: "🇨🇮", groups: [2, 2, 2, 2, 2] },
  { name: "Guinée",          dial: "224", flag: "🇬🇳", groups: [3, 2, 2, 2] },
  { name: "Burkina Faso",    dial: "226", flag: "🇧🇫", groups: [2, 2, 2, 2] },
  { name: "Bénin",           dial: "229", flag: "🇧🇯", groups: [2, 2, 2, 2, 2] },
  { name: "Togo",            dial: "228", flag: "🇹🇬", groups: [2, 2, 2, 2] },
  { name: "Nigeria",         dial: "234", flag: "🇳🇬", groups: [3, 3, 4] },
  { name: "Ghana",           dial: "233", flag: "🇬🇭", groups: [3, 3, 3] },
  { name: "Cameroun",        dial: "237", flag: "🇨🇲", groups: [3, 2, 2, 2] },
  { name: "Gabon",           dial: "241", flag: "🇬🇦", groups: [1, 2, 2, 2] },
  { name: "Mauritanie",      dial: "222", flag: "🇲🇷", groups: [2, 2, 2, 2] },
  { name: "Maroc",           dial: "212", flag: "🇲🇦", groups: [3, 3, 3] },
  { name: "Algérie",         dial: "213", flag: "🇩🇿", groups: [3, 2, 2, 2] },
  { name: "Tunisie",         dial: "216", flag: "🇹🇳", groups: [2, 2, 2, 2] },
  { name: "Égypte",          dial: "20",  flag: "🇪🇬", groups: [3, 3, 4] },
  { name: "Arabie Saoudite", dial: "966", flag: "🇸🇦", groups: [3, 3, 3] },
  { name: "Émirats arabes",  dial: "971", flag: "🇦🇪", groups: [2, 3, 4] },
  { name: "Qatar",           dial: "974", flag: "🇶🇦", groups: [2, 2, 2, 2] },
  { name: "Turquie",         dial: "90",  flag: "🇹🇷", groups: [3, 3, 2, 2] },
  { name: "France",          dial: "33",  flag: "🇫🇷", groups: [1, 2, 2, 2, 2] },
  { name: "Belgique",        dial: "32",  flag: "🇧🇪", groups: [3, 2, 2, 2] },
  { name: "Suisse",          dial: "41",  flag: "🇨🇭", groups: [2, 3, 2, 2] },
  { name: "Italie",          dial: "39",  flag: "🇮🇹", groups: [3, 3, 3] },
  { name: "Espagne",         dial: "34",  flag: "🇪🇸", groups: [3, 2, 2, 2] },
  { name: "Allemagne",       dial: "49",  flag: "🇩🇪", groups: [3, 4, 4] },
  { name: "Royaume-Uni",     dial: "44",  flag: "🇬🇧", groups: [4, 6] },
  { name: "Portugal",        dial: "351", flag: "🇵🇹", groups: [3, 3, 3] },
  { name: "Pays-Bas",        dial: "31",  flag: "🇳🇱", groups: [3, 4, 2] },
  { name: "États-Unis",      dial: "1",   flag: "🇺🇸", groups: [3, 3, 4] },
  { name: "Canada",          dial: "1",   flag: "🇨🇦", groups: [3, 3, 4] },
  { name: "Chine",           dial: "86",  flag: "🇨🇳", groups: [3, 4, 4] },
];

/** Pays sans indicatif dédié : saisie libre « +… » (numéro rare / fallback). */
export const PHONE_OTHER: PhoneCountry = {
  name: "Autre (international)",
  dial: "",
  flag: "🌍",
  groups: [],
};

// ─── Indicatifs par nom de pays (User.country / Tenant.country) ───────────────

const DIAL_BY_COUNTRY_NAME: Record<string, string> = Object.fromEntries(
  PHONE_COUNTRIES.map((c) => [c.name.toLowerCase(), c.dial])
);

/** Indicatif deviné depuis le nom d'un pays (liste PILGRIM_COUNTRIES). */
export function guessDialFromCountry(countryName?: string | null): string {
  const key = String(countryName ?? "").trim().toLowerCase();
  return DIAL_BY_COUNTRY_NAME[key] ?? "227";
}

// ─── Découpage / formatage ────────────────────────────────────────────────────

export function digitsOnly(value?: string | null): string {
  return String(value ?? "").replace(/\D/g, "");
}

/** Retrouve le pays d'un E.164 (« +22790123456 » → Niger). Préfixe le plus long. */
export function findPhoneCountry(e164?: string | null): PhoneCountry {
  const digits = digitsOnly(e164);
  let best: PhoneCountry | null = null;
  for (const country of PHONE_COUNTRIES) {
    if (!country.dial) continue;
    if (digits.startsWith(country.dial)) {
      if (!best || country.dial.length > best.dial.length) best = country;
    }
  }
  return best ?? PHONE_OTHER;
}

/** Découpe un E.164 en { dial, national }. */
export function splitE164(e164?: string | null): { dial: string; national: string } {
  const country = findPhoneCountry(e164);
  const digits = digitsOnly(e164);
  if (!country.dial) return { dial: "", national: digits };
  return { dial: country.dial, national: digits.slice(country.dial.length) };
}

/** « 90123456 » + [2,2,2,2] → « 90 12 34 56 » (affichage de saisie). */
export function formatNational(national: string, groups: number[]): string {
  const digits = digitsOnly(national);
  if (!groups.length) return digits;
  let out = "";
  let index = 0;
  for (const size of groups) {
    if (index >= digits.length) break;
    out += (out ? " " : "") + digits.slice(index, index + size);
    index += size;
  }
  if (index < digits.length) out += " " + digits.slice(index);
  return out;
}

/** Nombre maximum de chiffres nationaux pour ce pays. */
export function maxNationalDigits(groups: number[]): number {
  return groups.length ? groups.reduce((a, b) => a + b, 0) : 15;
}

/**
 * Affichage lisible : « +22790123456 » → « +227 90 12 34 56 ».
 * Pays inconnu → groupage générique par paires depuis la droite.
 */
export function formatPhoneDisplay(e164?: string | null): string {
  const value = String(e164 ?? "").trim();
  if (!value) return "";
  if (!value.startsWith("+")) return value;
  const country = findPhoneCountry(value);
  const { dial, national } = splitE164(value);
  if (!dial) return value;
  const groups = country.groups.length ? country.groups : Array.from({ length: 4 }, () => 2);
  return `+${dial} ${formatNational(national, groups)}`.trim();
}

// ─── Normalisation (stockage) ─────────────────────────────────────────────────

/**
 * Le numéro est-il crédible ? Écarte les saisies manifestement factices du type
 * « +227 00 000 00 00 » (partie nationale entièrement nulle).
 */
function isPlausibleE164(value: string): boolean {
  if (!/^\+\d{7,15}$/.test(value)) return false;
  const { national } = splitE164(value);
  if (!national) return false;
  if (/^0+$/.test(national)) return false;
  return true;
}

/**
 * Normalise un numéro saisi vers le format de STOCKAGE : E.164 compact
 * (« +22790123456 »). C'est LA fonction de modération : elle est appliquée à
 * toutes les entrées (API agence, inscription publique, portail pèlerin,
 * superadmin) et par le script de rattrapage des données existantes.
 *
 *   « +227 89 12 34 56 » → "+22789123456"
 *   « 00227 89 12 34 56 » → "+22789123456"
 *   « 22789123456 »      → "+22789123456"
 *   « 89123456 »         → "+22789123456"   (indicatif par défaut)
 *   « 089123456"         → "+22789123456"   (0 national retiré)
 *   « +33 6 12 34 56 78 » → "+33612345678"  (diaspora : conservé tel quel)
 *   « +227 00 000 00 00 » → null            (numéro factice)
 *
 * @param raw        valeur saisie (n'importe quel format courant)
 * @param opts.dial  indicatif par défaut sans « + » (défaut : Niger = SMS)
 * @returns E.164 compact, ou null si vide/inexploitable
 */
export function normalizeE164(
  raw?: string | null,
  opts: { defaultDial?: string } = {}
): string | null {
  const compact = String(raw ?? "")
    .replace(/[\s.\-()/]/g, "")
    .trim();
  if (!compact) return null;

  const dial = digitsOnly(opts.defaultDial ?? SMS_DIAL);
  let value = compact;

  if (value.startsWith("00")) {
    value = `+${value.slice(2)}`;
  } else if (!value.startsWith("+")) {
    if (!/^\d+$/.test(value)) return null;
    if (value.startsWith("0")) {
      // Format national avec 0 de tête : « 089123456 » → « +22789123456 »
      value = `+${dial}${value.replace(/^0+/, "")}`;
    } else if (value.startsWith(dial) && value.length >= dial.length + 7) {
      // Indicatif déjà saisi mais sans « + »
      value = `+${value}`;
    } else {
      value = `+${dial}${value}`;
    }
  }

  return isPlausibleE164(value) ? value : null;
}
// ─── Éligibilité SMS (règle métier : NIGER uniquement) ────────────────────────

export const SMS_DIAL = "227";

/** Numéro nigérien complet et crédible (+227 + 8 chiffres). */
export function isNigerNumber(e164?: string | null): boolean {
  return /^\+227\d{8}$/.test(String(e164 ?? "").trim());
}

/** Canal possible pour ce contact : « SMS » (+227) | « EMAIL » | « NONE ». */
export function resolveChannel(
  phone?: string | null,
  email?: string | null
): "SMS" | "EMAIL" | "NONE" {
  if (isNigerNumber(phone)) return "SMS";
  if (isDeliverableEmail(email)) return "EMAIL";
  return "NONE";
}

// ─── Éligibilité email ────────────────────────────────────────────────────────

/**
 * Domaines techniques générés quand l'agence crée un pèlerin sans email
 * (« pilgrim-…@<agence>.nomail ») : ils ne peuvent évidemment rien recevoir.
 */
const FICTIONAL_EMAIL_DOMAINS = ["nomail", "invalid", "local", "test", "example.com", "example.org"];

/**
 * L'adresse peut-elle réellement recevoir un message ?
 * Écarte les emails de remplissage créés par l'application, pour que le canal
 * de repli ne tente pas un envoi voué à l'échec.
 */
export function isDeliverableEmail(email?: string | null): boolean {
  const value = String(email ?? "").trim().toLowerCase();
  const at = value.lastIndexOf("@");
  if (at <= 0 || at === value.length - 1) return false;

  const domain = value.slice(at + 1);
  if (!domain.includes(".")) return false;
  if (domain.includes(" ")) return false;

  const tld = domain.split(".").pop() ?? "";
  if (!tld || tld.length < 2) return false;
  if (FICTIONAL_EMAIL_DOMAINS.some((fake) => domain === fake || domain.endsWith(`.${fake}`))) {
    return false;
  }
  return true;
}
