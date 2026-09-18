// ─────────────────────────────────────────────────────────────────────────────
// Thème de marque par tenant (batch 1 — COULEURS uniquement).
//
// Principe : les couleurs de l'UI ne sont PAS codées en dur. Les utilitaires
// Tailwind (bg-primary, text-gold, bg-cream…) sont mappés dans globals.css sur
// des variables CSS runtime (--brand, --accent…). Ce module :
//   1. lit Tenant.theme (JSON) en tolérant l'absence/invalidité des valeurs ;
//   2. calcule les déclinaisons (dark/light/deep/cream) à partir de la couleur
//      de base — pas besoin de demander 9 couleurs à l'agence ;
//   3. produit le bloc <style> injecté par les layouts (public + admin agence).
//
// Les textes/contenus (hero, à-propos…) seront thémés dans un batch ultérieur.
// Les couleurs sémantiques (vert=payé, rouge=rejeté, orange=partiel) restent
// volontairement globales : un thème change l'identité, pas la sémantique.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_BRAND = "#0f5132"; // vert ZAM
export const DEFAULT_ACCENT = "#b8860b"; // or ZAM

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Normalise une couleur saisie (#abc, #AABBCC, invalide…) en #rrggbb, sinon fallback. */
export function normalizeHex(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const v = input.trim();
  if (!HEX_RE.test(v)) return fallback;
  const h = v.slice(1).toLowerCase();
  return h.length === 3
    ? "#" + h.split("").map((c) => c + c).join("")
    : "#" + h;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Éclaircit (> 0) ou assombrit (< 0) une couleur. amount ∈ [-1, 1].
 * shade("#0f5132", -0.25) ≈ #0a3d26 (le --brand-dark historique).
 */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = amount < 0 ? 0 : 255;
  const p = Math.min(1, Math.abs(amount));
  const mix = (c: number) => (target - c) * p + c;
  return rgbToHex(mix(r), mix(g), mix(b));
}

/** Couleur de texte lisible posée sur un fond `hex` (blanc ou presque-noir). */
export function readableOn(hex: string): "#ffffff" | "#101828" {
  const [r, g, b] = hexToRgb(hex);
  // Luminance perçue (formule empirique suffisante pour l'UI)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#101828" : "#ffffff";
}

/** Lit Tenant.theme et retourne les 2 couleurs de marque validées. */
export function readTenantThemeColors(raw: unknown): { brand: string; accent: string } {
  const t = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    brand: normalizeHex(t.primaryColor, DEFAULT_BRAND),
    // le seed historique utilisait "secondaryColor" ; "accentColor" est accepté aussi
    accent: normalizeHex(t.accentColor ?? t.secondaryColor, DEFAULT_ACCENT),
  };
}

/** Variables CSS runtime dérivées du thème du tenant. */
export function tenantThemeVars(raw: unknown): Record<string, string> {
  const { brand, accent } = readTenantThemeColors(raw);
  const t = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    "--brand": brand,
    "--brand-dark": shade(brand, -0.25),
    "--brand-light": shade(brand, 0.18),
    "--brand-deep": shade(brand, -0.62), // fonds très sombres (footer, sidebar)
    "--on-brand": readableOn(brand),
    "--on-accent": readableOn(accent),
    "--accent": accent,
    "--accent-dark": shade(accent, -0.2),
    "--accent-light": shade(accent, 0.25),
    "--cream": shade(brand, 0.92), // teintes très pâles de la marque (fonds de cartes)
    "--cream-dark": shade(brand, 0.84),

    // ── Neutres (surfaces, textes, bordures) ───────────────────────────────
    // Dérivés de la marque pour rester cohérents en white-label, mais toujours
    // très clairs : les textes restent donc lisibles (contraste garanti).
    // Surchargeables finement via theme.surfaceColor / textColor / borderColor…
    "--surface": normalizeHex(t.surfaceColor, "#ffffff"),
    "--surface-muted": normalizeHex(t.surfaceMutedColor, shade(brand, 0.965)),
    "--text": normalizeHex(t.textColor, "#111827"),
    "--text-muted": normalizeHex(t.textMutedColor, "#6b7280"),
    "--text-soft": normalizeHex(t.textSoftColor, "#9ca3af"),
    "--border": normalizeHex(t.borderColor, shade(brand, 0.9)),
  };
}

/** Bloc CSS `:root{…}` à injecter dans le layout du tenant. */
export function themeStyleTag(raw: unknown): string {
  const body = Object.entries(tenantThemeVars(raw))
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return `:root{${body}}`;
}

// ─── Overlay i18n : textes personnalisés du tenant ────────────────────────────
//
// Les messages statiques (src/messages/{fr,en,ar}/index.json) sont la BASE de
// repli universelle. Le tenant ne stocke que les clés qu'il a personnalisées,
// sous forme de chemins pointés localisés :
//
//   theme.content = {
//     "home.heroTitle1":   { "fr": "…", "en": "…", "ar": "…" },
//     "footer.brandDesc":  { "fr": "…" },
//   }
//
// Règles :
//   • clé pointée absente du thème            → texte statique (repli) ;
//   • clé présente SANS valeur pour `locale`  → texte statique de CETTE langue
//     (pas de repli croisé : un tenant qui n'a écrit qu'en FR ne doit pas
//     écraser le texte EN du portail avec du français) ;
//   • les clés sans point (slots historiques : metaDescription…) ne sont PAS
//     des overrides i18n et sont ignorées ici.

/** Injecte les overrides i18n du tenant dans l'arbre des messages (pur). */
export function applyTenantOverrides(
  messages: Record<string, unknown>,
  theme: unknown,
  locale: string
): Record<string, unknown> {
  const t = theme && typeof theme === "object" ? (theme as Record<string, unknown>) : {};
  const content = t.content && typeof t.content === "object" ? (t.content as Record<string, unknown>) : {};

  const entries = Object.entries(content).filter(([key]) => key.includes("."));
  if (!entries.length) return messages;

  const clone = structuredClone(messages);
  for (const [key, val] of entries) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const value = (val as Record<string, unknown>)[locale];
    if (typeof value !== "string" || !value.trim()) continue;
    setDeep(clone, key.split("."), value.trim());
  }
  return clone;
}

/** Pose une valeur en profondeur (`["footer","brandDesc"]`), en créant les niveaux. */
function setDeep(obj: Record<string, unknown>, path: string[], value: string): void {
  let node = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    const next = node[key];
    if (!next || typeof next !== "object" || Array.isArray(next)) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[path[path.length - 1]] = value;
}

// ─── Catalogue des textes personnalisables (éditeur superadmin) ───────────────
//
// Chaque slot = un chemin i18n pointé (voir applyTenantOverrides) éditable en
// fr/en/ar. Le catalogue est construit AUTOMATIQUEMENT depuis les fichiers de
// messages (fr = référence) : tout texte public est personnalisable, sans liste
// manuelle à maintenir. Le texte statique est PRÉ-REMPLI dans l'éditeur et sert
// de repli : un slot sans override affiche exactement le texte de la plateforme.

export type SlotLocales = Record<"fr" | "en" | "ar", string>;

export type ThemeSlot = {
  key: string;
  label: string;
  multiline?: boolean;
};

export type ThemeSlotGroup = { group: string; slots: ThemeSlot[] };

export type ThemeMessages = Record<"fr" | "en" | "ar", Record<string, unknown>>;

/** Libellés de groupes par namespace i18n (l'ordre de la carte = ordre d'affichage). */
const GROUP_LABELS: Record<string, string> = {
  nav: "Navigation",
  header: "En-tête",
  footer: "Pied de page",
  home: "Accueil",
  about: "À propos",
  history: "Notre histoire",
  contact: "Contact",
  offers: "Offres",
  offersData: "Contenu des offres",
  guide: "Guide du pèlerin",
  coran: "Coran",
  qibla: "Boussole Qibla",
  reviews: "Avis clients",
  pilgrim: "Espace pèlerin",
  portal: "Portail pèlerin (connexion / inscription)",
  comingSoon: "Page « Bientôt disponible »",
  placeholder: "Champs de formulaire",
};

const GROUP_ORDER = Object.keys(GROUP_LABELS);

/** « heroTitle1 » → « Hero title 1 ». */
function humanize(segment: string): string {
  const spaced = segment.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Construit le catalogue COMPLET des textes éditables en parcourant l'arbre FR
 * (chaque feuille string = un slot). Les statiques EN/AR sont résolues côté
 * page via readMessagePath. Aucune clé n'est oubliée par construction.
 */
export function buildThemeTextCatalog(messages: ThemeMessages): ThemeSlotGroup[] {
  const fr = messages.fr && typeof messages.fr === "object" ? messages.fr : {};
  const collected = new Map<string, ThemeSlot[]>();

  const walk = (prefix: string, node: unknown): void => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        walk(key, v);
        continue;
      }
      if (typeof v !== "string") continue;
      const ns = key.split(".")[0];
      let list = collected.get(ns);
      if (!list) {
        list = [];
        collected.set(ns, list);
      }
      list.push({
        key,
        label: humanize(key.split(".").pop() ?? key),
        multiline: v.includes("\n") || v.length > 90,
      });
    }
  };
  walk("", fr);

  const ordered: ThemeSlotGroup[] = [];
  for (const ns of GROUP_ORDER) {
    const slots = collected.get(ns);
    if (slots?.length) ordered.push({ group: GROUP_LABELS[ns], slots });
  }
  for (const [ns, slots] of collected) {
    if (!GROUP_ORDER.includes(ns) && slots.length) ordered.push({ group: humanize(ns), slots });
  }
  return ordered;
}

/** Slot spécial (non i18n pointé) : description SEO consommée par generateMetadata. */
export const META_DESCRIPTION_SLOT = "metaDescription";

/** Payload sérialisable vers l'éditeur client. */
export type ThemeSlotPayload = {
  key: string;
  label: string;
  hint?: string;
  multiline?: boolean;
  /** Textes statiques (placeholder + repli). */
  statics: SlotLocales;
  /** Override actuel du tenant ("" = utilise le statique). */
  override: SlotLocales;
};

export type ThemeSlotGroupPayload = { group: string; slots: ThemeSlotPayload[] };

/** Lit une clé pointée dans l'arbre des messages ("" si absente). */
export function readMessagePath(messages: Record<string, unknown>, dotted: string): string {
  let node: unknown = messages;
  for (const part of dotted.split(".")) {
    if (!node || typeof node !== "object") return "";
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : "";
}

// ── Batch 2 : contenus éditoriaux (textes) + branding ──────────────────────

/** Valeur localisée ({fr,en,ar}) ou chaîne simple → texte pour `locale`, fallback fr. */
export function pickLocalized(value: unknown, locale: string): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() ? value : null;
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const l of [locale, "fr", "en", "ar"]) {
      const v = o[l];
      if (typeof v === "string" && v.trim()) return v;
    }
  }
  return null;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export type TenantBranding = {
  tenantName: string;
  logoUrl: string | null;
  whatsappNumber: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  phone: string | null;
  heroImageUrl: string | null;
  offersBannerUrl: string | null;
  guideBannerUrl: string | null;
  coranBannerUrl: string | null;
  founderImageUrl: string | null;
  oumraRamadanImageUrl: string | null;
  hajjImageUrl: string | null;
  makkahImageUrl: string | null;
  medineImageUrl: string | null;
  menuIhramImageUrl: string | null;
  menuMosqueUrl: string | null;
  historyGallery1Url: string | null;
  historyGallery2Url: string | null;
  historyGallery3Url: string | null;
  historyGallery4Url: string | null;
  historyGallery5Url: string | null;
  historyGallery6Url: string | null;
  historyTeam1Url: string | null;
  historyTeam2Url: string | null;
  partnerIataUrl: string | null;
  partnerCohoUrl: string | null;
  partnerMinistryUrl: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  footerDescription: string | null;
  metaDescription: string | null;
};

/**
 * Construit l'objet branding (textes résolus pour `locale`) sérialisable
 * vers le provider client. Source : Tenant.theme = {
 *   logoUrl, whatsappNumber, phone, facebookUrl, tiktokUrl,
 *   content: { heroTitle: {fr,en,ar}, heroSubtitle, footerDescription, metaDescription }
 * }
 */
export function readTenantBranding(raw: unknown, locale: string, tenantName: string): TenantBranding {
  const t = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const c = t.content && typeof t.content === "object" ? (t.content as Record<string, unknown>) : {};
  return {
    tenantName,
    logoUrl: str(t.logoUrl),
    whatsappNumber: str(t.whatsappNumber),
    facebookUrl: str(t.facebookUrl),
    tiktokUrl: str(t.tiktokUrl),
    phone: str(t.phone),
    heroImageUrl: str(t.heroImageUrl),
    offersBannerUrl: str(t.offersBannerUrl),
    guideBannerUrl: str(t.guideBannerUrl),
    coranBannerUrl: str(t.coranBannerUrl),
    founderImageUrl: str(t.founderImageUrl),
    oumraRamadanImageUrl: str(t.oumraRamadanImageUrl),
    hajjImageUrl: str(t.hajjImageUrl),
    makkahImageUrl: str(t.makkahImageUrl),
    medineImageUrl: str(t.medineImageUrl),
    menuIhramImageUrl: str(t.menuIhramImageUrl),
    menuMosqueUrl: str(t.menuMosqueUrl),
    historyGallery1Url: str(t.historyGallery1Url),
    historyGallery2Url: str(t.historyGallery2Url),
    historyGallery3Url: str(t.historyGallery3Url),
    historyGallery4Url: str(t.historyGallery4Url),
    historyGallery5Url: str(t.historyGallery5Url),
    historyGallery6Url: str(t.historyGallery6Url),
    historyTeam1Url: str(t.historyTeam1Url),
    historyTeam2Url: str(t.historyTeam2Url),
    partnerIataUrl: str(t.partnerIataUrl),
    partnerCohoUrl: str(t.partnerCohoUrl),
    partnerMinistryUrl: str(t.partnerMinistryUrl),
    heroTitle: pickLocalized(c.heroTitle, locale),
    heroSubtitle: pickLocalized(c.heroSubtitle, locale),
    footerDescription: pickLocalized(c.footerDescription, locale),
    metaDescription: pickLocalized(c.metaDescription, locale),
  };
}

/**
 * Fusionne un patch de thème (éditeur superadmin) dans le thème existant.
 * - couleurs normalisées (hex invalide → défaut) ;
 * - valeurs texte vides → null (efface) ;
 * - content fusionné clé par clé et locale par locale (chaîne vide → retire).
 */
export function mergeTenantTheme(
  existing: unknown,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const base: Record<string, unknown> =
    existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};

  for (const k of [
    "logoUrl",
    "whatsappNumber",
    "phone",
    "facebookUrl",
    "tiktokUrl",
    "heroImageUrl",
    "offersBannerUrl",
    "guideBannerUrl",
    "coranBannerUrl",
    "founderImageUrl",
    "oumraRamadanImageUrl",
    "hajjImageUrl",
    "makkahImageUrl",
    "medineImageUrl",
    "menuIhramImageUrl",
    "menuMosqueUrl",
    "historyGallery1Url",
    "historyGallery2Url",
    "historyGallery3Url",
    "historyGallery4Url",
    "historyGallery5Url",
    "historyGallery6Url",
    "historyTeam1Url",
    "historyTeam2Url",
    "partnerIataUrl",
    "partnerCohoUrl",
    "partnerMinistryUrl",
  ]) {
    if (patch[k] !== undefined) {
      const v = patch[k];
      base[k] = typeof v === "string" && v.trim() ? v.trim() : null;
    }
  }
  if (typeof patch.primaryColor === "string" && patch.primaryColor.trim()) {
    base.primaryColor = normalizeHex(patch.primaryColor, DEFAULT_BRAND);
  }
  if (typeof patch.accentColor === "string" && patch.accentColor.trim()) {
    base.accentColor = normalizeHex(patch.accentColor, DEFAULT_ACCENT);
  }

  const contentPatch =
    patch.content && typeof patch.content === "object" ? (patch.content as Record<string, unknown>) : {};
  const content: Record<string, unknown> =
    base.content && typeof base.content === "object" ? { ...(base.content as Record<string, unknown>) } : {};
  for (const [key, val] of Object.entries(contentPatch)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const prev = content[key] && typeof content[key] === "object" ? { ...(content[key] as Record<string, unknown>) } : {};
      for (const [loc, v] of Object.entries(val as Record<string, unknown>)) {
        if (typeof v === "string" && v.trim()) prev[loc] = v.trim();
        else delete prev[loc];
      }
      if (Object.keys(prev).length) content[key] = prev;
      else delete content[key]; // toutes les langues revenues au défaut → clé retirée
    }
  }
  base.content = content;
  return base;
}
