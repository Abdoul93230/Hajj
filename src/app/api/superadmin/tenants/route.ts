import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { notifyAgencyCreated } from "@/lib/agency-notify";

// GET — liste toutes les agences (hors platform)
export async function GET() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    where: { status: { not: "PLATFORM" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: { where: { role: { not: "SUPER_ADMIN" }, active: true } },
          reservations: true,
        },
      },
    },
  });

  return NextResponse.json(tenants);
}

// POST — créer une nouvelle agence + son admin
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name,
      slug,
      email,
      phone,
      address,
      country,
      plan,
      adminName,
      adminEmail,
      adminPassword,
    } = body;

    if (!name || !slug || !email || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // Vérifier unicité du slug
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "Ce slug est déjà utilisé" }, { status: 409 });
    }

    // Créer le tenant et l'admin en transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          name,
          email,
          phone: phone || null,
          address: address || null,
          country: country || "NE",
          plan: plan || "STARTER",
          status: "ACTIVE",
        },
      });

      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      const admin = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
          role: "AGENCY_ADMIN",
          permissions: [],
          active: true,
        },
      });

      return { tenant, admin };
    });

    // Notification de bienvenue (email et/ou SMS) — BEST-EFFORT : un envoi raté
    // ne doit jamais faire échouer la création. On remonte simplement l'état de
    // chaque canal au superadmin (SENT / SKIPPED + raison / FAILED).
    // Base du lien de connexion : NEXT_PUBLIC_APP_URL fait foi ; sinon on
    // reconstruit depuis l'hôte public de la requête (x-forwarded-* derrière un
    // proxy), pour ne jamais envoyer un lien interne type http://app:3000.
    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? (host ? `${proto}://${host}` : new URL(req.url).origin);

    const notifications = await notifyAgencyCreated({
      tenant: result.tenant,
      admin: { name: result.admin.name, email: result.admin.email },
      adminPassword,
      appUrl,
    }).catch(() => null);

    return NextResponse.json(
      {
        tenant: result.tenant,
        admin: { id: result.admin.id, email: result.admin.email, name: result.admin.name },
        notifications,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
