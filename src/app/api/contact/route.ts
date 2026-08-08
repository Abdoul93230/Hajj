import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const { name, email, phone, subject, message } = await req.json();
    if (!name || !subject || !message) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const headersList = await headers();
    const tenantSlug = headersList.get("x-tenant-slug");
    const tenant = tenantSlug
      ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
      : null;
    if (!tenant) {
      return NextResponse.json({ error: "Agence introuvable" }, { status: 404 });
    }

    await prisma.contactMessage.create({
      data: { tenantId: tenant.id, name, email: email ?? "", phone, subject, message },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
