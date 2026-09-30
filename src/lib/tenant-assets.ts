// ─── Visuels des portails d'agence : « configuration actuelle » ou placeholders
//
// Historiquement, l'apparence d'un portail venait d'une agence de référence
// (ZAM) : ses photos étaient figées dans les pages comme valeurs de repli.
// Aujourd'hui chaque agence choisit son point de départ À LA CRÉATION :
//
//   • theme.assetMode = "PLACEHOLDER" → PORTRAIT NEUTRE : toutes les images du
//     portail pointent vers les visuels neutres de la plateforme (ci-dessous),
//     que l'agence remplace quand elle veut dans Personnalisation → Médias ;
//   • theme.assetMode = "TEMPLATE"    → CONFIGURATION ACTUELLE : les images
//     absentes du thème gardent les visuels figés dans les pages (photos de
//     l'agence de référence), exactement comme avant.
//
// Le mode est stocké sur le tenant (Tenant.theme) : aucune migration n'est
// nécessaire pour les agences existantes, qui restent en "TEMPLATE".
import { PLATFORM_LOGO_URL } from "@/lib/platform-brand";

export type PortalAssetMode = "TEMPLATE" | "PLACEHOLDER";

/** Clé de `Tenant.theme` qui porte le mode. */
export const ASSET_MODE_KEY = "assetMode";

/** Visuels neutres générés par `npm run brand:assets`. */
export const PLACEHOLDER_WIDE = "/brand/placeholders/photo-wide.png";
export const PLACEHOLDER_LANDSCAPE = "/brand/placeholders/photo-landscape.png";
export const PLACEHOLDER_PARTNER = "/brand/placeholders/partner-logo.png";

/** Toutes les clés de `Tenant.theme` qui portent une image du portail public. */
export const PORTAL_IMAGE_KEYS = [
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
] as const;

export type PortalImageKey = (typeof PORTAL_IMAGE_KEYS)[number];

/** Visuel neutre associé à chaque emplacement (format adapté à l'usage). */
export const PLACEHOLDER_ASSETS: Record<PortalImageKey, string> = {
  // Bandeaux larges (fonds de hero / d'en-têtes de pages)
  heroImageUrl: PLACEHOLDER_WIDE,
  offersBannerUrl: PLACEHOLDER_WIDE,
  guideBannerUrl: PLACEHOLDER_WIDE,
  coranBannerUrl: PLACEHOLDER_WIDE,
  // Visuels « paysage » (sections, méga-menu, galerie, équipe)
  founderImageUrl: PLACEHOLDER_LANDSCAPE,
  oumraRamadanImageUrl: PLACEHOLDER_LANDSCAPE,
  hajjImageUrl: PLACEHOLDER_LANDSCAPE,
  makkahImageUrl: PLACEHOLDER_LANDSCAPE,
  medineImageUrl: PLACEHOLDER_LANDSCAPE,
  menuIhramImageUrl: PLACEHOLDER_LANDSCAPE,
  menuMosqueUrl: PLACEHOLDER_LANDSCAPE,
  historyGallery1Url: PLACEHOLDER_LANDSCAPE,
  historyGallery2Url: PLACEHOLDER_LANDSCAPE,
  historyGallery3Url: PLACEHOLDER_LANDSCAPE,
  historyGallery4Url: PLACEHOLDER_LANDSCAPE,
  historyGallery5Url: PLACEHOLDER_LANDSCAPE,
  historyGallery6Url: PLACEHOLDER_LANDSCAPE,
  historyTeam1Url: PLACEHOLDER_LANDSCAPE,
  historyTeam2Url: PLACEHOLDER_LANDSCAPE,
  // Logos d'accréditations (IATA, COHO, Ministère…)
  partnerIataUrl: PLACEHOLDER_PARTNER,
  partnerCohoUrl: PLACEHOLDER_PARTNER,
  partnerMinistryUrl: PLACEHOLDER_PARTNER,
};


// ─── Lecture / écriture du mode ──────────────────────────────────────────────

/**
 * Mode d'images du tenant lu depuis `Tenant.theme`.
 * Toute valeur absente ou inattendue retombe sur "TEMPLATE" = comportement
 * historique (les agences déjà en base ne changent donc pas d'apparence).
 */
export function readPortalAssetMode(raw: unknown): PortalAssetMode {
  const t = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return t[ASSET_MODE_KEY] === "PLACEHOLDER" ? "PLACEHOLDER" : "TEMPLATE";
}

/** Vrai si le portail de ce tenant doit afficher les visuels neutres. */
export function usesPlaceholderAssets(raw: unknown): boolean {
  return readPortalAssetMode(raw) === "PLACEHOLDER";
}

/**
 * Image effective d'un emplacement de portail :
 *   valeur du thème si renseignée, sinon le visuel neutre en mode PLACEHOLDER,
 *   sinon `null` (les pages retombent alors sur la configuration actuelle).
 */
export function resolvePortalImage(
  rawTheme: unknown,
  key: PortalImageKey,
  value: string | null
): string | null {
  if (value) return value;
  return usesPlaceholderAssets(rawTheme) ? PLACEHOLDER_ASSETS[key] : null;
}

/**
 * Thème initial d'une agence créée depuis la console superadmin.
 *
 * `useTemplateConfig = true`  → configuration actuelle (photos de l'agence de
 *                               référence) : le thème ne fige aucune image.
 * `useTemplateConfig = false` → visuels neutres à personnaliser.
 *
 * Dans les deux cas le logo par défaut est celui de la plateforme (hajj-e.com) :
 * l'agence le remplace par le sien dans Personnalisation → Logo & contact.
 * Les couleurs ne sont pas figées : les défauts de la plateforme (vert/or de
 * hajj-e) s'appliquent tant que l'agence n'a pas choisi les siennes.
 */
export function newTenantTheme(useTemplateConfig: boolean): Record<string, string> {
  return {
    [ASSET_MODE_KEY]: useTemplateConfig ? "TEMPLATE" : "PLACEHOLDER",
    logoUrl: PLATFORM_LOGO_URL,
  };
}

/** Libellé du point de départ, pour les comptes rendus (console superadmin). */
export const ASSET_MODE_LABEL: Record<PortalAssetMode, string> = {
  TEMPLATE: "Configuration actuelle (agence de référence)",
  PLACEHOLDER: "Visuels neutres à personnaliser",
};
