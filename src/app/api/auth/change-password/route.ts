import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAction } from "@/lib/audit";
import { validateNewPassword } from "@/lib/password";

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
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      passwordChangedBy: user.id,
    },
  });

  await logAction({
    session,
    action: "auth.password_changed",
    resource: "user",
    resourceId: user.id,
  });

  return NextResponse.json({ ok: true, mustChangePassword: false });
}
