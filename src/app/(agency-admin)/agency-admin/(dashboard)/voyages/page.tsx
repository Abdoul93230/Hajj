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

  // Filtrer par année sélectionnée (cohérence avec pèlerins)
  const currentYear = new Date().getFullYear();
  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;
  const from = new Date(selectedYear, 0, 1);
  const to   = new Date(selectedYear + 1, 0, 1);

  const offers = await prisma.offer.findMany({
    where: { tenantId, active: true, createdAt: { gte: from, lt: to } },
    include: {
      _count: {
        select: {
          reservations: {
            where: { status: "CONFIRMED" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
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

  return <VoyagesClient offers={serializedOffers} tenantSlug={tenantSlug} />;
}
