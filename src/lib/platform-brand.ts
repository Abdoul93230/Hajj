// ─── Identité de la PLATEFORME (hajj-e) ──────────────────────────────────────
//
// Source unique du nom et des logos de la plateforme : emails, SMS, pieds de
// page, landing, favicon et logo par défaut des nouvelles agences.
// Surchargeable sans toucher au code (voir README) :
//   NEXT_PUBLIC_PLATFORM_NAME="hajj-e.com"
//   NEXT_PUBLIC_PLATFORM_LOGO_URL="/brand/hajj-e-logo.png"
//
// ⚠️ Ne PAS confondre avec l'identité d'une AGENCE (Tenant.name / theme.logoUrl) :
// les messages destinés aux pèlerins restent signés au nom de leur agence, seul
// ce qui engage la plateforme (création d'agence, landing, emails automatiques)
// utilise cette identité-ci.

export const PLATFORM_NAME =
  (process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "").trim() || "hajj-e.com";

/** Baseline officielle (reprise du logo vertical). */
export const PLATFORM_TAGLINE = "Votre partenaire pour le Hajj & la Omra";

/**
 * Lockup horizontal (icône + « Hajj-e »), fond transparent.
 * Généré par `npm run brand:assets` depuis public/images/logo.png.
 */
export const PLATFORM_LOGO_URL =
  (process.env.NEXT_PUBLIC_PLATFORM_LOGO_URL ?? "").trim() || "/brand/hajj-e-logo.png";

/** Icône carrée seule (badges compacts, overlays, favicon). */
export const PLATFORM_LOGO_MARK_URL = "/brand/hajj-e-mark.png";

/** Lockup vertical + baseline : présentations, presse, documents. */
export const PLATFORM_LOGO_STACKED_URL = "/brand/hajj-e-logo-stacked.png";
