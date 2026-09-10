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
