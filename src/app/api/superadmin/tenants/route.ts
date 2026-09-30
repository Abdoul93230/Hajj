import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { notifyAgencyCreated } from "@/lib/agency-notify";
import { tenantPublicUrl } from "@/lib/tenant-slug";
import { newTenantTheme, readPortalAssetMode } from "@/lib/tenant-assets";

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
      // Point de départ des visuels du portail :
      //   true  → configuration actuelle (photos de l'agence de référence)
      //   false → visuels neutres à personnaliser (défaut)
      useTemplateConfig,
    } = body;

    if (!name || !slug || !email || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    // Vérifier unicité du slug
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "Ce slug est déjà utilisé" }, { status: 409 });
    }

    // Visuels du portail : « configuration actuelle » ou placeholders neutres.
    // Le logo par défaut est celui de la plateforme (hajj-e.com) dans les deux cas.
    const theme = newTenantTheme(useTemplateConfig === true);

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
          theme,
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
          // Mot de passe provisoire : l'admin de l'agence DOIT le changer à sa
          // première connexion (modale bloquante dans le dashboard).
          mustChangePassword: true,
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

    // Le message présente DEUX adresses : le portail public (vu par les pèlerins)
    // et l'espace de gestion. En mode sous-domaines → https://<slug>.<domaine>.
    const publicUrl = tenantPublicUrl(result.tenant.slug, appUrl);
    const loginUrl = `${appUrl.replace(/\/+$/, "")}/agency-admin/login`;

    const notifications = await notifyAgencyCreated({
      tenant: result.tenant,
      admin: { name: result.admin.name, email: result.admin.email },
      adminPassword,
      appUrl,
      publicUrl,
    }).catch(() => null);

    return NextResponse.json(
      {
        tenant: result.tenant,
        admin: { id: result.admin.id, email: result.admin.email, name: result.admin.name },
        // Renvoyés à la console superadmin pour affichage/copie dans la modale
        publicUrl,
        loginUrl,
        // Visuels appliqués au portail (récapitulatif dans la modale)
        assetMode: readPortalAssetMode(theme),
        notifications,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
