import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAgencySession } from "@/lib/permissions";
import { logAction } from "@/lib/audit";
import { generateTempPassword, validateNewPassword } from "@/lib/password";

/**
 * POST /api/agency-admin/pilgrims/[id]/reset-password
 * L'agence réinitialise le mot de passe d'un de SES pèlerins (tenant-scopé).
 *
 * - sans corps ou `password` vide → mot de passe provisoire généré (crypto)
 * - avec `password` (≥ 8 car.)   → mot de passe personnalisé par l'agence
 * Dans les deux cas : hash bcrypt, `mustChangePassword: true` (changement
 * imposé au prochaine connexion du pèlerin), audit trail.
 * Le mot de passe en clair n'est renvoyé qu'UNE fois dans la réponse — il n'est
 * ni stocké, ni envoyé par SMS/email.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAgencySession();
  if (error) return error;

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const custom = typeof body?.password === "string" && body.password.trim()
    ? body.password
    : null;

  if (custom) {
    const strengthError = validateNewPassword(custom);
    if (strengthError) {
      return NextResponse.json({ error: strengthError }, { status: 400 });
    }
  }

  // Strictement dans le tenant de l'agence connectée.
  const target = await prisma.user.findFirst({
    where: { id, tenantId: session.tenantId, role: "PILGRIM" },
  });
  if (!target) {
    return NextResponse.json({ error: "Pèlerin introuvable" }, { status: 404 });
  }

  const tempPassword = custom ?? generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: target.id },
    data: {
      password: hashedPassword,
      mustChangePassword: true,
      passwordChangedAt: new Date(),
      passwordChangedBy: session.id,
    },
  });

  await logAction({
    session,
    action: "pilgrim.password_reset",
    resource: "user",
    resourceId: target.id,
  });

  return NextResponse.json({
    ok: true,
    tempPassword,
    mustChangePassword: true,
  });
}
