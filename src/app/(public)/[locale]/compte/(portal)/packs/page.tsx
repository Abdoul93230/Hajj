import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PacksClient from "./PacksClient";

// /compte/packs — les pèlerinages (packs) de l'agence du pèlerin + réservation
export default async function PacksPage({
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

  const serialized = offers
    .map((o) => {
      const data = (o.data ?? {}) as { maxCapacity?: number };
      return {
        id: o.id,
        titleFr: o.titleFr,
        type: o.type as string,
        descFr: o.descFr,
        departureDate: o.departureDate ? o.departureDate.toISOString() : null,
        returnDate: o.returnDate ? o.returnDate.toISOString() : null,
        currency: o.currency,
        priceAdult: o.priceAdult,
        priceChild: o.priceChild,
        priceBaby: o.priceBaby,
        priceCouple: o.priceCouple,
        provisional: o.provisional,
        confirmedCount: o._count.reservations,
        maxCapacity: data.maxCapacity ?? 0,
        alreadyBooked: myOfferIds.has(o.id),
      };
    })
    .sort((a, b) => {
      if (!a.departureDate) return 1;
      if (!b.departureDate) return -1;
      return a.departureDate.localeCompare(b.departureDate);
    });

  return <PacksClient offers={serialized} />;
}