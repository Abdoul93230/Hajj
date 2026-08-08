import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);
const PLATFORM_SLUG = "__platform__";
const COOKIE_NAME = "zam_session";

type Space = "superadmin" | "agency-admin" | "public";

function resolveSpaceFromHost(host: string): { space: Space; tenantSlug: string | null } {
  const h = host.split(":")[0];
  const parts = h.split(".");

  if (parts[0] === "superadmin" || parts[0] === "admin") {
    return { space: "superadmin", tenantSlug: null };
  }
  if (parts[0] === "dashboard" && parts.length >= 2) {
    return { space: "agency-admin", tenantSlug: parts[1] };
  }
  if (parts[0] !== "localhost" && parts[0] !== "127" && parts.length >= 2) {
    return { space: "public", tenantSlug: parts[0] };
  }
  return { space: "public", tenantSlug: process.env.DEV_DEFAULT_TENANT ?? "zam" };
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

  let { space, tenantSlug } = resolveSpaceFromHost(host);

  // En dev (localhost), détecter l'espace depuis le pathname
  if (space === "public") {
    if (pathname.startsWith("/superadmin")) {
      space = "superadmin";
      tenantSlug = null;
    } else if (pathname.startsWith("/agency-admin")) {
      space = "agency-admin";
      // Priorité au cookie zam_dev_tenant (posé au login) sur DEV_DEFAULT_TENANT
      const devTenantCookie = request.cookies.get("zam_dev_tenant")?.value;
      if (devTenantCookie) {
        tenantSlug = devTenantCookie;
      }
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

  // ── PORTAIL PUBLIC ───────────────────────────────────────────────────────
  const response = intlMiddleware(request);
  response.headers.set("x-space", space);
  response.headers.set("x-tenant-slug", tenantSlug ?? "");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
