import { NextResponse } from "next/server";
import { requirePilgrimSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

const CATEGORY_PRICE: Record<string, "priceAdult" | "priceChild" | "priceBaby" | "priceCouple"> = {
  ADULT: "priceAdult",
  CHILD: "priceChild",
  BABY: "priceBaby",
  COUPLE: "priceCouple",
};

// GET /api/reservations — les réservations du pèlerin connecté
export async function GET() {
  const { session, error } = await requirePilgrimSession();
  if (error) return error;

  const reservations = await prisma.reservation.findMany({
    where: { tenantId: session.tenantId, userId: session.id },
    include: { offer: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(reservations);
}

// POST /api/reservations — le pèlerin réserve un pack de SON agence
export async function POST(req: Request) {
  const { session, error } = await requirePilgrimSession();
  if (error) return error;
  const tenantId = session.tenantId;

  const body = await req.json();
  const { offerId, category, notes } = body;

  if (!offerId || !category) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }
  const priceKey = CATEGORY_PRICE[category];
  if (!priceKey) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }

  // Le voyage doit appartenir à l'agence du pèlerin et être actif
  const offer = await prisma.offer.findFirst({
    where: { id: offerId, tenantId, active: true },
  });
  if (!offer) {
    return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
  }

  // Pas de double inscription sur le même voyage
  const existing = await prisma.reservation.findFirst({
    where: { tenantId, userId: session.id, offerId, status: { not: "CANCELLED" } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Vous êtes déjà inscrit à ce voyage." },
      { status: 409 }
    );
  }

  // Capacité : maxCapacity dans offer.data (0/absent = illimité)
  const data = (offer.data ?? {}) as { maxCapacity?: number };
  const maxCapacity = data.maxCapacity ?? 0;
  if (maxCapacity > 0) {
    const confirmedCount = await prisma.reservation.count({
      where: { tenantId, offerId, status: "CONFIRMED" },
    });
    if (confirmedCount >= maxCapacity) {
      return NextResponse.json({ error: "Ce voyage est complet." }, { status: 409 });
    }
  }

  // Tarif selon la catégorie choisie (fallback : tarif adulte)
  const totalAmount = offer[priceKey] ?? offer.priceAdult;

  const reservation = await prisma.reservation.create({
    data: {
      tenantId,
      userId: session.id,
      offerId,
      category,
      status: "CONFIRMED", // même convention que l'inscription par l'agence
      totalAmount,
      notes: notes?.trim() || null,
      createdBy: session.id,
    },
    include: { offer: true },
  });

  await logAction({
    session,
    action: "pilgrim.reservation_created",
    resource: "Reservation",
    resourceId: reservation.id,
  });

  return NextResponse.json({ reservation }, { status: 201 });
}
