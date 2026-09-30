import type { UserRole, Permission } from "@/types";
import type { SessionPayload } from "@/lib/session";
import { getSession, PLATFORM_SLUG } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [],  // bypass total, vérifié séparément
  AGENCY_ADMIN: [
    "pilgrims:read", "pilgrims:write", "pilgrims:delete",
    "reservations:read", "reservations:write", "reservations:delete",
    "offers:read", "offers:write", "offers:delete",
    "messages:read", "messages:reply",
    "finances:read", "finances:write",
    "team:read", "team:write",
    "reviews:moderate",
    "portal:customize",
    "audit:read",
  ],
  AGENCY_AGENT: [],
  PILGRIM: [],
};

export function hasPermission(session: SessionPayload, permission: Permission): boolean {
  if (isSuperAdmin(session)) return true;
  if (ROLE_PERMISSIONS[session.role].includes(permission)) return true;
  return session.permissions.includes(permission);
}

export function isSuperAdmin(session: SessionPayload): boolean {
  return session.role === "SUPER_ADMIN" && session.tenantSlug === PLATFORM_SLUG;
}

export function isAgencyAdmin(session: SessionPayload): boolean {
  return session.role === "AGENCY_ADMIN" || isSuperAdmin(session);
}

export function isAgencyMember(session: SessionPayload): boolean {
  return ["AGENCY_ADMIN", "AGENCY_AGENT"].includes(session.role) || isSuperAdmin(session);
}

export function isPlatformTenant(tenantSlug: string): boolean {
  return tenantSlug === PLATFORM_SLUG;
}

// Vérifie session + statut actif du tenant en DB.
// Retourne { session } si OK, sinon une NextResponse d'erreur à retourner directement.
export async function requireAgencySession(): Promise<
  { session: SessionPayload; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await getSession();
  if (!session || !isAgencyMember(session)) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  }

  // Superadmin bypass — pas de tenant à vérifier
  if (isSuperAdmin(session)) return { session };

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { status: true },
  });

  if (!tenant || (tenant.status !== "ACTIVE" && tenant.status !== "TRIAL")) {
    return {
      error: NextResponse.json(
        { error: "Ce compte agence est suspendu." },
        { status: 403 }
      ),
    };
  }

  return { session };
}

/**
 * Garde des ÉDITEURS DE THÈME (couleurs, logo, images, textes).
 *
 * Autorise :
 *   1. le superadmin — sur n'importe quelle agence ;
 *   2. l'admin de l'agence PROPRIÉTAIRE, uniquement si le superadmin a ouvert
 *      la personnalisation autonome (`Tenant.selfPersonalization === true`).
 *
 * Les routes `/api/superadmin/tenants/[id]{,/logo,/media}` l'utilisent : les
 * éditeurs sont donc partagés entre l'espace superadmin et l'espace agence
 * (même écriture du thème, même audit) sans dupliquer la logique.
 */
export async function requireThemeEditor(tenantId: string): Promise<
  | { session: SessionPayload; theme: unknown; error?: never }
  | { session?: never; theme?: never; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, status: true, theme: true, selfPersonalization: true },
  });
  if (!tenant || tenant.status === "PLATFORM") {
    return { error: NextResponse.json({ error: "Tenant non modifiable" }, { status: 403 }) };
  }

  if (isSuperAdmin(session)) return { session, theme: tenant.theme };

  // Espace agence : sa propre agence, et seulement si la plateforme a activé
  // la personnalisation autonome (jamais accordée à un agent).
  if (!isAgencyAdmin(session) || session.tenantId !== tenant.id) {
    return { error: NextResponse.json({ error: "Non autorisé" }, { status: 403 }) };
  }
  if (tenant.selfPersonalization !== true) {
    return {
      error: NextResponse.json(
        {
          error:
            "La personnalisation n'est pas activée pour votre agence. Contactez la plateforme.",
        },
        { status: 403 }
      ),
    };
  }

  return { session, theme: tenant.theme };
}

// Vérifie la session PÈLERIN (role PILGRIM) + statut actif du tenant.
// Utilisé par les routes /api/pilgrim/* — toutes les requêtes sont scopées sur
// session.id + session.tenantId : un pèlerin ne peut accéder qu'à SES données.
export async function requirePilgrimSession(): Promise<
  { session: SessionPayload; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await getSession();
  if (!session || session.role !== "PILGRIM") {
    return { error: NextResponse.json({ error: "Connexion requise" }, { status: 401 }) };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { status: true },
  });
  if (!tenant || (tenant.status !== "ACTIVE" && tenant.status !== "TRIAL")) {
    return {
      error: NextResponse.json(
        { error: "Ce compte agence est suspendu." },
        { status: 403 }
      ),
    };
  }

  return { session };
}
