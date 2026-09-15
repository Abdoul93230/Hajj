import type { Metadata } from "next";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isAgencyMember } from "@/lib/permissions";
import { redirect } from "next/navigation";
import VoyagesClient from "./VoyagesClient";

export const metadata: Metadata = { title: "Voyages & Forfaits" };

export default async function VoyagesPage() {
  const session = await getSession();
  if (!session || !isAgencyMember(session)) {
    redirect("/agency-admin/login");
  }

  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  const tenantId = session.tenantId;

  // Filtrer par année sélectionnée (cohérence avec pèlerins).
  // Une offre appartient à une saison via seasonYear ; les anciennes offres
  // (seasonYear = null) retombent sur l'année de leur createdAt.
  const currentYear = new Date().getFullYear();
  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;
  const from = new Date(selectedYear, 0, 1);
  const to   = new Date(selectedYear + 1, 0, 1);

  // ── Organisation par défaut : 1 offre Hajj par année ──────────────────────
  // Si aucune offre Hajj n'existe pour la saison sélectionnée, on crée un
  // brouillon (provisoire, tarif 0) que l'admin complète ensuite.
  const hajjInYear = await prisma.offer.findFirst({
    where: {
      tenantId,
      type: "HAJJ",
      active: true,
      OR: [{ seasonYear: selectedYear }, { seasonYear: null, createdAt: { gte: from, lt: to } }],
    },
  });
  if (!hajjInYear) {
    await prisma.offer.create({
      data: {
        tenantId,
        slug: `hajj-${selectedYear}-${Date.now().toString(36)}`,
        type: "HAJJ",
        seasonYear: selectedYear,
        titleFr: `Hajj ${selectedYear}`,
        descFr: "Offre Hajj à compléter : dates, tarifs et capacité.",
        priceAdult: 0,
        provisional: true,
        active: true,
        data: { maxCapacity: 0 },
        createdBy: session.id,
      },
    });
  }

  const offers = await prisma.offer.findMany({
    where: {
      tenantId,
      active: true,
      OR: [{ seasonYear: selectedYear }, { seasonYear: null, createdAt: { gte: from, lt: to } }],
    },
    include: {
      _count: {
        select: {
          reservations: {
            where: { status: "CONFIRMED" },
          },
        },
      },
    },
    orderBy: [{ type: "asc" }, { departureDate: "asc" }],
  });

  const serializedOffers = offers.map((o) => ({
    ...o,
    departureDate: o.departureDate ? o.departureDate.toISOString() : null,
    returnDate: o.returnDate ? o.returnDate.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    confirmedCount: o._count.reservations,
    maxCapacity:
      o.data && typeof o.data === "object" && "maxCapacity" in (o.data as object)
        ? (o.data as { maxCapacity: number }).maxCapacity
        : 0,
  }));

  return <VoyagesClient offers={serializedOffers} tenantSlug={tenantSlug} selectedYear={selectedYear} />;
}
