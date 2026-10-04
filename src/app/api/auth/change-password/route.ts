import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession, createSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { validateNewPassword } from "@/lib/password";
import type { Permission, UserRole } from "@/types";

/**
 * POST /api/auth/change-password
 * Changement de mot de passe par l'utilisateur LUI-MÊME (session requise,
 * tout rôle : pèlerin, admin agence, agent…).
 *
 * C'est l'endpoint consommé par la modale bloquante « changement imposé »
 * (première connexion / mot de passe provisoire) et par tout changement
 * volontaire. Le drapeau `mustChangePassword` est levé ici.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { currentPassword, newPassword } = body ?? {};

  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    return NextResponse.json({ error: "Le mot de passe actuel est requis" }, { status: 400 });
  }

  const strengthError = validateNewPassword(newPassword, currentPassword);
  if (strengthError) {
    return NextResponse.json({ error: strengthError }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user || !user.active) {
    return NextResponse.json({ error: "Compte introuvable ou désactivé" }, { status: 401 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      passwordChangedBy: user.id,
    },
    include: { tenant: { select: { slug: true, status: true } } },
  });

  await logAction({
    session,
    action: "auth.password_changed",
    resource: "user",
    resourceId: user.id,
  });

  // ── RECONNEXION AUTOMATIQUE (nouveau token) ────────────────────────────────
  // On réémet IMMÉDIATEMENT un token de session à jour pour cet utilisateur, avec
  // ses droits relus en base. Sans cela, le navigateur continuait de naviguer avec
  // le token délivré à la 1re connexion (mot de passe provisoire) : les requêtes
  // suivantes du dashboard pouvaient être refusées (403) jusqu'à une reconnexion
  // manuelle. Le cookie `zam_session` est réécrit par createSession().
  await createSession({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role as UserRole,
    tenantId: updated.tenantId,
    tenantSlug: updated.tenant.slug,
    permissions: (updated.permissions ?? []) as Permission[],
  });

  return NextResponse.json({ ok: true, mustChangePassword: false });
}
