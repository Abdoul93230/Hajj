import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/session";
import type { Permission } from "@/types";

const PLATFORM_SLUG = "__platform__";

export async function POST(req: Request) {
  try {
    const { email, password, tenantSlug } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const slug = tenantSlug ?? PLATFORM_SLUG;
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      return NextResponse.json({ error: "Agence introuvable" }, { status: 404 });
    }

    // Bloquer la connexion si l'agence est suspendue ou annulée
    if (slug !== PLATFORM_SLUG && tenant.status !== "ACTIVE" && tenant.status !== "TRIAL") {
      return NextResponse.json(
        { error: "Ce compte agence est suspendu. Contactez l'administrateur." },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      include: { tenant: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    if (!user.active) {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }

    // Un SUPER_ADMIN ne peut se connecter QUE sur la page /superadmin/login
    // Un AGENCY_ADMIN/AGENT ne peut PAS obtenir un token superadmin
    if (slug === PLATFORM_SLUG && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }
    if (slug !== PLATFORM_SLUG && user.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    await createSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as SessionRole,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
      permissions: (user.permissions ?? []) as Permission[],
    });

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantSlug: user.tenant.slug,
    });

    // En dev, cookie lu par le middleware pour injecter le bon x-tenant-slug
    // (évite d'avoir à changer DEV_DEFAULT_TENANT à la main pour chaque agence)
    if (process.env.NODE_ENV !== "production" && user.tenant.slug !== PLATFORM_SLUG) {
      response.cookies.set("zam_dev_tenant", user.tenant.slug, {
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

type SessionRole = "SUPER_ADMIN" | "AGENCY_ADMIN" | "AGENCY_AGENT" | "PILGRIM";
