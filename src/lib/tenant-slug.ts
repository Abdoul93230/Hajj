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
//   • domaines racine de la plateforme (PLATFORM_ROOT_DOMAINS, ex. hajj-e.com)
//     → espace « platform » : la LANDING de la plateforme, jamais le portail
//     d'une agence ;
//   • sinon (localhost, 127.*, domaine nu inconnu, single-domain) → espace public
//     avec DEV_DEFAULT_TENANT s'il est défini, sinon la landing ;
//     jamais de valeur en dur.
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

export type Space = "superadmin" | "agency-admin" | "public" | "platform";

/**
 * Bascule de DÉVELOPPEMENT : cookie « zam_dev_mode=platform|tenant ».
 * Le middleware ne la lit QUE hors production (elle sert à basculer entre la
 * landing plateforme et le portail d'agence sur un même host type localhost).
 * En production, seul le host décide — voir platformRootDomains().
 */
export type DevMode = "platform" | "tenant";

/** DEV_DEFAULT_TENANT si renseigné (trim), sinon null. */
export function devDefaultTenant(): string | null {
  const value = (process.env.DEV_DEFAULT_TENANT ?? "").trim();
  return value || null;
}

/**
 * Routage multi-tenant par sous-domaine — piloté par `USE_SUBDOMAIN_TENANT`.
 *
 *   true  → le sous-domaine désigne l'agence en prod
 *           (zam.domaine.com, dashboard.zam.domaine.com, admin.domaine.com)
 *   false → mode MONO-TENANT : DEV_DEFAULT_TENANT est TOUJOURS utilisé, le
 *           sous-domaine du host est ignoré (déploiement d'une seule agence
 *           sur son propre domaine).
 *
 * Les espaces superadmin / agence restent accessibles par CHEMIN dans les deux
 * modes (/superadmin, /agency-admin — voir le middleware).
 */
export function subdomainRoutingEnabled(): boolean {
  const value = (process.env.USE_SUBDOMAIN_TENANT ?? "").trim().toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

/**
 * Domaines RACINE de la plateforme — ceux qui affichent la LANDING (vitrine de
 * la plateforme) et jamais le portail d'une agence :
 *
 *   PLATFORM_ROOT_DOMAINS="hajj-e.com,www.hajj-e.com"
 *
 * Repli : le host de `NEXT_PUBLIC_APP_URL` (racine + www) si la variable est
 * absente. `localhost` / IP ne sont JAMAIS des domaines plateforme : en dev la
 * bascule se fait par le cookie « zam_dev_mode » (voir DevMode).
 */
export function platformRootDomains(): string[] {
  const raw = (process.env.PLATFORM_ROOT_DOMAINS ?? "").trim();
  const declared = raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (declared.length > 0) return declared;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (appUrl) {
    try {
      const host = new URL(appUrl).hostname.toLowerCase();
      if (host && host !== "localhost" && !host.startsWith("127.")) {
        const bare = host.startsWith("www.") ? host.slice(4) : host;
        return bare === host ? [host, `www.${host}`] : [bare, host];
      }
    } catch {
      // URL invalide : aucun domaine plateforme déclaré (on ne devine rien)
    }
  }
  return [];
}

/** Le host (sans port) est-il un domaine racine de la plateforme ? */
export function isPlatformHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return platformRootDomains().includes(host.split(":")[0].toLowerCase());
}

/** Valeur exploitable du cookie « zam_dev_mode » (sinon null). */
export function devModeFromCookie(value: string | null | undefined): DevMode | null {
  const v = (value ?? "").trim().toLowerCase();
  return v === "platform" || v === "tenant" ? v : null;
}

/**
 * Espace + tenant déduits du host de la requête.
 *
 *   USE_SUBDOMAIN_TENANT=true :
 *     hajj-e.com / www.hajj-e.com → { platform, null }      ← landing
 *     dashboard.zam.hajj-e.com    → { agency-admin, "zam" }
 *     zam.hajj-e.com              → { public, "zam" }
 *     admin.hajj-e.com            → { superadmin, null }
 *     localhost:3000              → { public, DEV_DEFAULT_TENANT ?? null }
 *     domaine nu inconnu / www    → { public, DEV_DEFAULT_TENANT } s'il est
 *                                   défini (déploiement mono-agence), sinon
 *                                   { platform, null } (multi-agences : la
 *                                   landing, jamais un tenant inventé)
 *
 *   USE_SUBDOMAIN_TENANT=false (ou absent) :
 *     n'importe quel host      → { public, DEV_DEFAULT_TENANT ?? null }
 *
 * `opts.devMode` (cookie « zam_dev_mode ») force la LANDING en développement :
 * le middleware ne le transmet jamais en production.
 */
export function resolveSpaceFromHost(
  host: string,
  opts: { devMode?: DevMode | null } = {}
): { space: Space; tenantSlug: string | null } {
  // Bascule de développement : la landing sur n'importe quel host (localhost).
  if (opts.devMode === "platform") return { space: "platform", tenantSlug: null };

  // Mode mono-tenant : la valeur .env fait foi, le sous-domaine est ignoré.
  if (!subdomainRoutingEnabled()) {
    return { space: "public", tenantSlug: devDefaultTenant() };
  }

  const h = host.split(":")[0];
  const parts = h.split(".");

  // Domaine racine de la plateforme (hajj-e.com, www.hajj-e.com) → landing.
  if (isPlatformHost(h)) return { space: "platform", tenantSlug: null };

  if (parts[0] === "superadmin" || parts[0] === "admin") {
    return { space: "superadmin", tenantSlug: null };
  }
  if (parts[0] === "dashboard" && parts.length >= 2) {
    return { space: "agency-admin", tenantSlug: parts[1] ?? null };
  }
  // ⚠️ longueur >= 3 : « hajj-e.com » (domaine nu) n'est PAS le sous-domaine
  // « hajj-e » — même garde-fou que resolveAgencyAdminTenant(). « www » n'est
  // jamais un slug d'agence non plus.
  if (
    parts[0] !== "localhost" &&
    parts[0] !== "127" &&
    parts[0] !== "www" &&
    parts.length >= 3
  ) {
    return { space: "public", tenantSlug: parts[0] };
  }

  // Domaine nu / www / localhost : mono-agence si DEV_DEFAULT_TENANT est défini,
  // sinon PLATEFORME — un tenant ne se devine jamais.
  const fallback = devDefaultTenant();
  return fallback
    ? { space: "public", tenantSlug: fallback }
    : { space: "platform", tenantSlug: null };
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
 * Slug du tenant pour l'ESPACE AGENCE (« /agency-admin »).
 *
 * Ordre de priorité — l'identité de l'admin connecté ne doit JAMAIS être écrasée
 * par un défaut de déploiement :
 *   1. sous-domaine explicite : `dashboard.<slug>.<domaine>` ou `<slug>.<domaine>`
 *      (quand USE_SUBDOMAIN_TENANT=true) ;
 *   2. cookie « zam_dev_tenant » posé à la connexion (mono-domaine multi-agences) ;
 *   3. `DEV_DEFAULT_TENANT` — dernier recours (déploiement dédié à une agence).
 *
 * 🐛 Bug historique : le middleware réutilisait `resolveSingleDomainTenant()`
 * pour /agency-admin. Dès que DEV_DEFAULT_TENANT était renseigné, il écrasait le
 * slug du sous-domaine/cookie ; le layout agence comparait alors
 * `session.tenantSlug !== x-tenant-slug` → redirection vers le formulaire :
 * « connexion réussie mais on reste sur /agency-admin/login ». Le public et le
 * superadmin n'étaient pas touchés (le premier utilise l'agence du host, le
 * second n'a pas de tenant).
 */
export function resolveAgencyAdminTenant(
  host: string | null | undefined,
  cookieSlug?: string | null
): string | null {
  if (subdomainRoutingEnabled() && host) {
    const h = host.split(":")[0];
    const parts = h.split(".");
    if (parts[0] === "dashboard" && parts[1]) return parts[1];
    // ⚠️ longueur >= 3 : « hajj-e.com » (domaine nu) n'est PAS le sous-domaine
    // « hajj-e » — on ne devine jamais un tenant à partir d'un domaine racine.
    if (parts[0] !== "localhost" && parts[0] !== "127" && parts.length >= 3) return parts[0];
  }
  const cookie = cookieSlug?.trim();
  if (cookie) return cookie;
  return devDefaultTenant();
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
