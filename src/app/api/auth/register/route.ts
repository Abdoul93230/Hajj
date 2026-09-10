import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { resolveTenantSlugFromHost } from "@/lib/tenant-slug";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Mot de passe trop court (min. 6 caractères)" }, { status: 400 });
    }

    // Résolution du tenant — le middleware n'injecte pas x-tenant-slug sur /api :
    // 1. header (si présent)  2. host de la requête  3. fallback DEV_DEFAULT_TENANT
    const headersList = await headers();
    const tenantSlug = headersList.get("x-tenant-slug")
      ?? resolveTenantSlugFromHost(headersList.get("host"));

    const tenant = tenantSlug
      ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
      : null;

    if (!tenant) {
      return NextResponse.json({ error: "Agence introuvable" }, { status: 404 });
    }
    // Une agence suspendue/annulée ne doit plus accepter d'inscriptions
    if (tenant.status !== "ACTIVE" && tenant.status !== "TRIAL") {
      return NextResponse.json(
        { error: "Cette agence ne peut plus accepter d'inscriptions." },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
    });
    if (existing) {
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hash, tenantId: tenant.id, role: "PILGRIM" },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
