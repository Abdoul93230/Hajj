import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// POST — créer ou remplacer la réservation d'un pèlerin sur un voyage
export async function POST(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const body = await req.json();
  const { pilgrimId, offerId, status = "CONFIRMED", totalAmount } = body;

  if (!pilgrimId || !offerId) {
    return NextResponse.json({ error: "pilgrimId et offerId sont requis" }, { status: 400 });
  }

  // Vérifier que le pèlerin et l'offre appartiennent au tenant
  const [pilgrim, offer] = await Promise.all([
    prisma.user.findFirst({ where: { id: pilgrimId, tenantId, role: "PILGRIM" } }),
    prisma.offer.findFirst({ where: { id: offerId, tenantId, active: true } }),
  ]);
  if (!pilgrim) return NextResponse.json({ error: "Pèlerin introuvable" }, { status: 404 });
  if (!offer)   return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });

  const amount = totalAmount ?? offer.priceAdult;

  // Dater dans l'année sélectionnée
  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const currentYear = new Date().getFullYear();
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;
  const createdAt = selectedYear === currentYear ? new Date() : new Date(selectedYear, 0, 2);

  // Supprimer l'ancienne réservation pour ce pèlerin sur cette saison (1 voyage à la fois)
  const from = new Date(selectedYear, 0, 1);
  const to   = new Date(selectedYear + 1, 0, 1);
  await prisma.reservation.deleteMany({
    where: { tenantId, userId: pilgrimId, createdAt: { gte: from, lt: to } },
  });

  // Créer la nouvelle
  const reservation = await prisma.reservation.create({
    data: {
      tenantId,
      userId: pilgrimId,
      offerId,
      status,
      totalAmount: amount,
      category: "ADULT",
      createdAt,
    },
    include: { offer: true },
  });

  return NextResponse.json({ reservation }, { status: 201 });
}

// DELETE — retirer un pèlerin d'un voyage
export async function DELETE(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { pilgrimId, reservationId } = await req.json();

  if (reservationId) {
    const res = await prisma.reservation.findFirst({ where: { id: reservationId, tenantId } });
    if (!res) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    await prisma.reservation.delete({ where: { id: reservationId } });
  } else if (pilgrimId) {
    await prisma.reservation.deleteMany({ where: { tenantId, userId: pilgrimId } });
  } else {
    return NextResponse.json({ error: "reservationId ou pilgrimId requis" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
