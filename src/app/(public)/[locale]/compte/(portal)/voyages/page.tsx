import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import VoyagesList from "./VoyagesList";

// /compte/voyages — les pèlerinages (Hajj / Omra) de l'agence du pèlerin
export default async function VoyagesPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session || session.role !== "PILGRIM") redirect(`/${locale}/compte`);

  const offers = await prisma.offer.findMany({
    where: { tenantId: session.tenantId, active: true },
    include: {
      _count: { select: { reservations: { where: { status: "CONFIRMED" } } } },
    },
  });

  // Voyages déjà réservés par le pèlerin (état "déjà réservé")
  const mine = await prisma.reservation.findMany({
    where: { tenantId: session.tenantId, userId: session.id, status: { not: "CANCELLED" } },
    select: { offerId: true },
  });
  const myOfferIds = new Set(mine.map((m) => m.offerId));

  const serialized = offers.map((o) => {
    const data = (o.data ?? {}) as { maxCapacity?: number };
    const departStart = o.departureDate ? new Date(o.departureDate) : null;
    departStart?.setHours(0, 0, 0, 0);
    return {
      id: o.id,
      titleFr: o.titleFr,
      type: o.type as string,
      descFr: o.descFr,
      departureDate: o.departureDate ? o.departureDate.toISOString() : null,
      returnDate: o.returnDate ? o.returnDate.toISOString() : null,
      currency: o.currency,
      priceAdult: o.priceAdult,
      provisional: o.provisional,
      confirmedCount: o._count.reservations,
      maxCapacity: data.maxCapacity ?? 0,
      alreadyBooked: myOfferIds.has(o.id),
      bookingClosed: departStart ? new Date() >= departStart : false,
    };
  });

  return <VoyagesList offers={serialized} />;
}