import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    }

    const { offerId, category, notes } = await req.json();
    if (!offerId || !category) {
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

    const reservation = await prisma.reservation.create({
      data: {
        tenantId: tenant.id,
        userId: session.id,
        offerId,
        category,
        notes,
        createdBy: session.id,
      },
      include: { offer: true },
    });
    return NextResponse.json(reservation, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  const tenant = tenantSlug
    ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    : null;
  if (!tenant) {
    return NextResponse.json({ error: "Agence introuvable" }, { status: 404 });
  }

  try {
    const reservations = await prisma.reservation.findMany({
      where: { tenantId: tenant.id, userId: session.id },
      include: { offer: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reservations);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
