import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { logAction } from "@/lib/audit";
import type { SessionPayload } from "@/lib/session";

// ─── MOT DE PASSE OUBLIÉ — vérification du code + nouveau mot de passe ────────

const MAX_ATTEMPTS = 5; // tentatives de vérification par code

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json({ error: "Code invalide. 6 chiffres attendus." }, { status: 400 });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Mot de passe trop court (min. 6 caractères)" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail, role: { notIn: ["SUPER_ADMIN"] } },
      include: { tenant: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 });
    }

    // Dernier code actif et non expiré pour ce user
    const otp = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!otp) {
      return NextResponse.json(
        { error: "Code invalide ou expiré. Demandez un nouveau code." },
        { status: 400 }
      );
    }

    // Limite de tentatives (anti brute-force)
    if (otp.attempts >= MAX_ATTEMPTS) {
      await prisma.passwordResetOtp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
      return NextResponse.json(
        { error: "Trop de tentatives. Demandez un nouveau code." },
        { status: 429 }
      );
    }

    // Vérification du code
    if (otp.codeHash !== sha256(code.trim())) {
      await prisma.passwordResetOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(
        { error: "Code invalide ou expiré. Demandez un nouveau code." },
        { status: 400 }
      );
    }

    // Code correct → mise à jour du mot de passe + consommation du code
    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hash },
      }),
      prisma.passwordResetOtp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      }),
      // Par sécurité : consommer tout autre code encore actif
      prisma.passwordResetOtp.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    // Audit trail
    await logAction({
      session: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "PILGRIM",
        tenantId: user.tenantId,
        tenantSlug: user.tenant.slug,
        permissions: [],
      } satisfies SessionPayload,
      action: "auth.password_reset_completed",
      resource: "User",
      resourceId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reset-password] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
