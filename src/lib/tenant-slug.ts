// Résolution du tenant (slug d'agence) — SOURCE UNIQUE DE VÉRITÉ, partagée par
// le middleware et les routes API.
//
// ⚠️ Fichier PUR : aucun import prisma ni "server-only" — consommable par le
// middleware (runtime Edge) comme par les routes API (Node).
//
// Deux consommateurs, la MÊME logique :
//   1. src/middleware.ts   → pose l'en-tête x-tenant-slug + choisit l'espace
//   2. les routes /api/…   → le middleware n'injecte PAS x-tenant-slug sur /api
//      (son matcher exclut "api") : elles rappellent ces helpers.
//
// Règle de priorité :
//   • sous-domaine « dashboard.<slug>.<domaine> »  → espace agence, tenant <slug>
//   • sous-domaine « <slug>.<domaine> »            → portail public, tenant <slug>
//   • « admin.* » / « superadmin.* »               → plateforme (tenant null)
//   • sinon (localhost, 127.*, single-domain)      → DEV_DEFAULT_TENANT, puis
//     cookie de login ; jamais de valeur en dur.
//
// IMPORTANT : DEV_DEFAULT_TENANT, quand il est défini, fait FOI sur les
// déploiements single-domain. En dev il désigne l'agence courante : changer la
// variable (zam → barakah) doit basculer TOUT le portail, y compris la
// connexion — le cookie « zam_dev_tenant » posé lors d'un login précédent ne
// doit pas le contredire, sinon la page et l'API se contredisent.
//
// Historique : le repli était auparavant « ?? "zam" » en dur. En l'absence de
// DEV_DEFAULT_TENANT, tout retombait donc silencieusement sur zam — d'où des
// inscriptions/connexions dans la mauvaise agence. On renvoie désormais null :
// chacun décide (404 « Agence introuvable », recherche globale héritée, …).

export type Space = "superadmin" | "agency-admin" | "public";

/** DEV_DEFAULT_TENANT si renseigné (trim), sinon null. */
export function devDefaultTenant(): string | null {
  const value = (process.env.DEV_DEFAULT_TENANT ?? "").trim();
  return value || null;
}

/**
 * Espace + tenant déduits du host de la requête.
 *
 *   dashboard.zam.hajj-…     → { agency-admin, "zam" }
 *   zam.hajj-platform.com    → { public, "zam" }
 *   admin.hajj-platform.com  → { superadmin, null }
 *   localhost:3000           → { public, DEV_DEFAULT_TENANT ?? null }
 */
export function resolveSpaceFromHost(host: string): { space: Space; tenantSlug: string | null } {
  const h = host.split(":")[0];
  const parts = h.split(".");

  if (parts[0] === "superadmin" || parts[0] === "admin") {
    return { space: "superadmin", tenantSlug: null };
  }
  if (parts[0] === "dashboard" && parts.length >= 2) {
    return { space: "agency-admin", tenantSlug: parts[1] ?? null };
  }
  if (parts[0] !== "localhost" && parts[0] !== "127" && parts.length >= 2) {
    return { space: "public", tenantSlug: parts[0] };
  }
  return { space: "public", tenantSlug: devDefaultTenant() };
}

/**
 * Slug de tenant déduit du seul host (routes API en Node).
 * Voir le tableau de `resolveSpaceFromHost` ; renvoie null si indéterminé.
 */
export function resolveTenantSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return devDefaultTenant();
  return resolveSpaceFromHost(host).tenantSlug;
}

/**
 * Tenant d'un déploiement single-domain (dev localhost, prod sans sous-domaine) :
 *   DEV_DEFAULT_TENANT défini → il fait foi (bascule manuelle de l'agence)
 *   sinon                     → cookie « zam_dev_tenant » posé au login
 */
export function resolveSingleDomainTenant(cookieSlug?: string | null): string | null {
  return devDefaultTenant() ?? (cookieSlug?.trim() || null);
}

/**
 * Tenant d'une route API d'authentification — ordre de priorité :
 *   1. `explicitSlug` : corps de la requête (ex. « __platform__ » du superadmin)
 *   2. en-tête `x-tenant-slug` (si un intermédiaire le pose)
 *   3. host : sous-domaine (prod multi-domaines)
 *   4. single-domain : DEV_DEFAULT_TENANT, puis cookie de login
 *
 * Renvoie null si AUCUN tenant ne peut être déterminé : l'appelant décide alors
 * (recherche globale héritée, ou rejet). On ne devine JAMAIS une agence.
 */
export function resolveApiTenantSlug(opts: {
  explicitSlug?: string | null;
  headerSlug?: string | null;
  host?: string | null;
  cookieSlug?: string | null;
}): string | null {
  const explicit = opts.explicitSlug?.trim();
  if (explicit) return explicit;

  const header = opts.headerSlug?.trim();
  if (header) return header;

  const fromHost = resolveTenantSlugFromHost(opts.host);
  if (fromHost) return fromHost;

  return opts.cookieSlug?.trim() || null;
}
