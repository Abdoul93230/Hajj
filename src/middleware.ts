import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import {
  devModeFromCookie,
  resolveAgencyAdminTenant,
  resolveSpaceFromHost,
  type DevMode,
} from "@/lib/tenant-slug";

const intlMiddleware = createIntlMiddleware(routing);
const PLATFORM_SLUG = "__platform__";
const COOKIE_NAME = "zam_session";
/** Bascule dev landing ⇄ portail d'agence (ignorée en production). */
const DEV_MODE_COOKIE = "zam_dev_mode";
const DEV_MODE_PARAM = "__mode";
/** Préfixe PHYSIQUE de la landing, invisible en prod (masqué par un rewrite). */
const LANDING_SEGMENT = "platform";

const LOCALES = routing.locales as readonly string[];

/** Locale de la landing : cookie next-intl → Accept-Language → défaut. */
function resolveLandingLocale(request: NextRequest): string {
  const cookie = request.cookies.get("NEXT_LOCALE")?.value?.trim().toLowerCase();
  if (cookie && LOCALES.includes(cookie)) return cookie;

  const accept = request.headers.get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const base = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (LOCALES.includes(base)) return base;
  }
  return routing.defaultLocale;
}

async function getSessionPayload(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET
    );
    const { payload } = await jwtVerify(token, secret);
    return payload as { role?: string; tenantSlug?: string };
  } catch {
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "localhost:3000";
  const pathname = request.nextUrl.pathname;

  // ── BASCULE DE DÉVELOPPEMENT (jamais en production) ──────────────────────
  // ?__mode=platform|tenant pose le cookie « zam_dev_mode » puis redirige vers
  // l'URL nettoyée : on peut ainsi basculer landing ⇄ portail d'agence sur un
  // même host (localhost). En production, seul le host décide.
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction && request.nextUrl.searchParams.has(DEV_MODE_PARAM)) {
    const requested = devModeFromCookie(request.nextUrl.searchParams.get(DEV_MODE_PARAM));
    const url = request.nextUrl.clone();
    url.searchParams.delete(DEV_MODE_PARAM);
    const response = NextResponse.redirect(url);
    if (requested) {
      response.cookies.set(DEV_MODE_COOKIE, requested, { path: "/", sameSite: "lax" });
    }
    return response;
  }
  const devMode: DevMode | null = isProduction
    ? null
    : devModeFromCookie(request.cookies.get(DEV_MODE_COOKIE)?.value);

  let { space, tenantSlug } = resolveSpaceFromHost(host, { devMode });

  // Sur single-domain (localhost, Render, Vercel sans subdomain) :
  // détecter l'espace depuis le pathname et résoudre le tenant
  if (space === "public" || space === "platform") {
    if (pathname.startsWith("/superadmin")) {
      space = "superadmin";
      tenantSlug = null;
    } else if (pathname.startsWith("/agency-admin")) {
      space = "agency-admin";
      // MÊME règle que les routes API (src/lib/tenant-slug.ts) : le sous-domaine
      // puis le cookie de connexion désignent l'agence ; DEV_DEFAULT_TENANT ne
      // sert que de dernier recours. Ne JAMAIS écraser l'identité de la session
      // par un défaut de déploiement (sinon « connecté mais renvoyé au login »).
      tenantSlug = resolveAgencyAdminTenant(host, request.cookies.get("zam_dev_tenant")?.value);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-space", space);
  requestHeaders.set("x-tenant-slug", tenantSlug ?? "");

  // ── SUPER ADMIN ──────────────────────────────────────────────────────────
  if (space === "superadmin") {
    const isLoginPage = pathname === "/superadmin/login" || pathname === "/superadmin/login/";

    if (!isLoginPage) {
      // Vérifier que le token appartient bien à un SUPER_ADMIN du tenant platform
      const session = await getSessionPayload(request);
      const isSuperAdmin = session?.role === "SUPER_ADMIN" && session?.tenantSlug === PLATFORM_SLUG;

      if (!isSuperAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = "/superadmin/login";
        return NextResponse.redirect(url);
      }
    }

    if (!pathname.startsWith("/superadmin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/superadmin" + (pathname === "/" ? "" : pathname);
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── AGENCY ADMIN ─────────────────────────────────────────────────────────
  if (space === "agency-admin") {
    const isLoginPage = pathname === "/agency-admin/login" || pathname === "/agency-admin/login/";

    if (!isLoginPage) {
      // Vérifier que le token n'est PAS un superadmin qui tente d'accéder à l'espace agence
      // (le superadmin a son propre espace, il ne peut pas accéder ici directement)
      const session = await getSessionPayload(request);
      const isSuperAdminToken = session?.role === "SUPER_ADMIN" && session?.tenantSlug === PLATFORM_SLUG;

      if (isSuperAdminToken) {
        const url = request.nextUrl.clone();
        url.pathname = "/agency-admin/login";
        return NextResponse.redirect(url);
      }
    }

    if (!pathname.startsWith("/agency-admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/agency-admin" + (pathname === "/" ? "" : pathname);
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── LANDING PLATEFORME (domaine racine : hajj-e.com, www.hajj-e.com…) ─────
  if (space === "platform") {
    const locale = resolveLandingLocale(request);
    // Locale réellement présente dans l'URL (elle prime sur la détection)
    const pathLocale =
      LOCALES.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)) ?? null;

    // La landing vit PHYSIQUEMENT sous /<locale>/platform : un accès direct à ce
    // chemin interne est renvoyé vers l'URL publique (pas de duplicate content).
    if (
      pathLocale &&
      (pathname === `/${pathLocale}/${LANDING_SEGMENT}` ||
        pathname.startsWith(`/${pathLocale}/${LANDING_SEGMENT}/`))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/${pathLocale}${pathname.slice(
        pathLocale.length + LANDING_SEGMENT.length + 2
      )}`;
      return NextResponse.redirect(url);
    }

    // Le portail d'une agence n'existe pas sur le domaine racine : la locale est
    // toujours le premier segment, puis le chemin interne est masqué (rewrite).
    if (!pathLocale) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
      return NextResponse.redirect(url);
    }

    // L'en-tête de locale de next-intl n'est posé QUE par son middleware : sans
    // lui, le layout racine (lang/dir du <html>) retomberait sur le défaut.
    requestHeaders.set("X-NEXT-INTL-LOCALE", pathLocale);

    const url = request.nextUrl.clone();
    url.pathname = `/${pathLocale}/${LANDING_SEGMENT}${pathname.slice(pathLocale.length + 1)}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // ── PORTAIL PUBLIC ───────────────────────────────────────────────────────
  // Chemin interne de la landing sur un domaine d'agence : on renvoie à l'accueil
  // de la locale (cette URL n'est jamais publique).
  {
    const pathLocale =
      LOCALES.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)) ?? null;
    if (
      pathLocale &&
      (pathname === `/${pathLocale}/${LANDING_SEGMENT}` ||
        pathname.startsWith(`/${pathLocale}/${LANDING_SEGMENT}/`))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/${pathLocale}`;
      return NextResponse.redirect(url);
    }
  }

  const response = intlMiddleware(request);
  response.headers.set("x-space", space);
  response.headers.set("x-tenant-slug", tenantSlug ?? "");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
