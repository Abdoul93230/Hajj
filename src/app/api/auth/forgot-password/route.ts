import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createHash, randomInt } from "crypto";
import { sendOtpEmail } from "@/lib/mail";
import { resolveApiTenantSlug } from "@/lib/tenant-slug";
import type { SessionPayload } from "@/lib/session";
import { logAction } from "@/lib/audit";

// ─── MOT DE PASSE OUBLIÉ — envoi du code OTP par email ────────────────────────

const OTP_TTL_MS = 10 * 60 * 1000;      // code valable 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000;   // 1 demande max par minute

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // ─ Résolution de l'agence ──────────────────────────────────────────────
    // Même règle que /api/auth/login : en dev DEV_DEFAULT_TENANT désigne
    // l'agence courante (aucun sous-domaine), en prod le sous-domaine, sinon le
    // cookie. L'utilisateur est ensuite cherché STRICTEMENT dans cette agence :
    // un email peut exister dans plusieurs agences, et une recherche globale
    // ramenait la première créée — d'où un email de réinitialisation signé au
    // nom d'une autre agence (ex. « Zam » alors que le compte est dans Barakah).
    const headersList = await headers();
    const cookieStore = await cookies();

    const slug = resolveApiTenantSlug({
      headerSlug: headersList.get("x-tenant-slug"),
      host: headersList.get("host"),
      cookieSlug: cookieStore.get("zam_dev_tenant")?.value,
    });

    // Réponse identique que l'email existe ou non (pas de fuite d'information)
    const silentSuccess = NextResponse.json({ success: true });

    let user = null;
    if (slug) {
      const tenant = await prisma.tenant.findUnique({ where: { slug } });
      if (!tenant) return silentSuccess;
      user = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          tenantId: tenant.id,
          role: { notIn: ["SUPER_ADMIN"] },
        },
        include: { tenant: true },
      });
    } else {
      // Aucune agence identifiable (prod single-domain sans cookie) : filet de
      // sécurité hérité, recherche globale hors superadmins.
      user = await prisma.user.findFirst({
        where: { email: normalizedEmail, role: { notIn: ["SUPER_ADMIN"] } },
        include: { tenant: true },
      });
    }

    if (!user || !user.active) {
      return silentSuccess;
    }

    // Cooldown anti-spam : pas plus d'un code par minute
    const recent = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        lastSentAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
      },
      orderBy: { lastSentAt: "desc" },
    });
    if (recent) {
      return NextResponse.json(
        { error: "Un code a déjà été envoyé récemment. Attendez une minute avant de réessayer." },
        { status: 429 }
      );
    }

    // Génération du code à 6 chiffres (crypto sécurisé)
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");

    // Invalider les anciens codes encore actifs
    await prisma.passwordResetOtp.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetOtp.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        email: normalizedEmail,
        codeHash: sha256(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        // ⚠️ null EXPLICITE : Prisma MongoDB ne fait pas correspondre
        // `usedAt: null` aux champs absents → les requêtes d'invalidation
        // et de vérification ne trouveraient jamais le code sinon
        usedAt: null,
      },
    });

    try {
      await sendOtpEmail({
        to: normalizedEmail,
        code,
        userName: user.name,
        tenantName: user.tenant.name,
      });
    } catch (mailErr) {
      console.error("[forgot-password] envoi email échoué:", mailErr);
      // Le code vient d'être créé mais non reçu : on l'invalide pour forcer
      // une nouvelle demande propre au prochain essai
      await prisma.passwordResetOtp.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      return NextResponse.json(
        { error: "Impossible d'envoyer l'email pour le moment. Réessayez dans un instant." },
        { status: 502 }
      );
    }

    // Audit trail (session pèlerin factice — pas de session lors d'un reset)
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
      action: "auth.password_reset_requested",
      resource: "User",
      resourceId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[forgot-password] erreur:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
