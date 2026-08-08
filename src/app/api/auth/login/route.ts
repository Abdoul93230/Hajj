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

    let user: Awaited<ReturnType<typeof prisma.user.findUnique>> & { tenant: { slug: string; status: string } } | null = null;
    let slug = tenantSlug as string | undefined;

    if (slug === PLATFORM_SLUG) {
      // Connexion superadmin explicite
      const tenant = await prisma.tenant.findUnique({ where: { slug: PLATFORM_SLUG } });
      if (!tenant) return NextResponse.json({ error: "Plateforme introuvable" }, { status: 404 });
      user = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email } },
        include: { tenant: true },
      });
    } else if (slug) {
      // Slug fourni explicitement → chercher dans ce tenant précis
      const tenant = await prisma.tenant.findUnique({ where: { slug } });
      if (tenant) {
        user = await prisma.user.findUnique({
          where: { tenantId_email: { tenantId: tenant.id, email } },
          include: { tenant: true },
        });
      }
      // Si pas trouvé avec ce slug, on tente la recherche par email (cas single-domain)
      if (!user) {
        user = await prisma.user.findFirst({
          where: { email, role: { notIn: ["SUPER_ADMIN"] } },
          include: { tenant: true },
        }) as typeof user;
      }
    } else {
      // Pas de slug → single-domain : cherche l'utilisateur par email dans toutes les agences
      user = await prisma.user.findFirst({
        where: { email, role: { notIn: ["SUPER_ADMIN"] } },
        include: { tenant: true },
      }) as typeof user;
    }

    if (!user) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect" }, { status: 401 });
    }

    slug = user.tenant.slug;

    // Bloquer la connexion si l'agence est suspendue ou annulée
    if (slug !== PLATFORM_SLUG && user.tenant.status !== "ACTIVE" && user.tenant.status !== "TRIAL") {
      return NextResponse.json(
        { error: "Ce compte agence est suspendu. Contactez l'administrateur." },
        { status: 403 }
      );
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

    // Cookie tenant : lu par le middleware pour résoudre le bon tenant
    // sur les déploiements single-domain (Render, Vercel sans subdomain, dev localhost)
    if (user.tenant.slug !== PLATFORM_SLUG) {
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
