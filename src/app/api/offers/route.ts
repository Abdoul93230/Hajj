import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function GET() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  const tenant = tenantSlug
    ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    : null;
  if (!tenant) {
    return NextResponse.json({ error: "Agence introuvable" }, { status: 404 });
  }
  try {
    const offers = await prisma.offer.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: { departureDate: "asc" },
    });
    return NextResponse.json(offers);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
