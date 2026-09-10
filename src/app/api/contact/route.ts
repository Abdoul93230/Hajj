import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { resolveTenantSlugFromHost } from "@/lib/tenant-slug";

export async function POST(req: Request) {
  try {
    const { name, email, phone, subject, message } = await req.json();
    if (!name || !subject || !message) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    // Résolution du tenant — header puis fallback host (le middleware
    // n'injecte pas x-tenant-slug sur /api)
    const headersList = await headers();
    const tenantSlug = headersList.get("x-tenant-slug")
      ?? resolveTenantSlugFromHost(headersList.get("host"));
    const tenant = tenantSlug
      ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
      : null;
    if (!tenant) {
      return NextResponse.json({ error: "Agence introuvable" }, { status: 404 });
    }
    // Une agence suspendue/annulée ne doit plus accepter de messages
    if (tenant.status !== "ACTIVE" && tenant.status !== "TRIAL") {
      return NextResponse.json(
        { error: "Cette agence ne peut plus accepter de messages." },
        { status: 403 }
      );
    }

    await prisma.contactMessage.create({
      data: { tenantId: tenant.id, name, email: email ?? "", phone, subject, message },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
