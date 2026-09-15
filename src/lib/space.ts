// Espace d'accueil selon le rôle de l'utilisateur connecté.
// Utilisé par le header public (UserMenu + menu mobile) pour rediriger
// l'avatar vers le bon espace : pèlerin, agence ou super admin.
export function spaceHomeForRole(role?: string | null): string {
  if (role === "SUPER_ADMIN") return "/superadmin";
  if (role === "AGENCY_ADMIN" || role === "AGENCY_AGENT") return "/agency-admin";
  return "/compte/mon-dossier"; // PILGRIM
}

// /agency-admin et /superadmin sont HORS de la route [locale] : ils ne doivent
// pas passer par le Link i18n (qui préfixerait /fr, /en, /ar → 404).
export function isLocaleAwareSpace(href: string): boolean {
  return href.startsWith("/compte");
}

// Libellé de l'espace (FR codé en dur, convention des composants de layout)
export function spaceLabelForRole(role?: string | null): string {
  if (role === "SUPER_ADMIN") return "Super admin";
  if (role === "AGENCY_ADMIN" || role === "AGENCY_AGENT") return "Espace agence";
  return "Espace pèlerin";
}
