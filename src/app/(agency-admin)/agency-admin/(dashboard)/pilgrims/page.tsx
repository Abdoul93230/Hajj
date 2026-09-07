import type { Metadata } from "next";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isAgencyMember } from "@/lib/permissions";
import { redirect } from "next/navigation";
import PilgrimsClient from "./PilgrimsClient";

export const metadata: Metadata = { title: "Gestion des Pèlerins" };

export default async function PilgrimsPage() {
  const session = await getSession();
  if (!session || !isAgencyMember(session)) {
    redirect("/agency-admin/login");
  }

  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";
  const tenantId = session.tenantId;

  // ── Resolve selected year ──────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const parsedCookieYear = cookieYear ? parseInt(cookieYear, 10) : NaN;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  const minYear = tenant ? tenant.createdAt.getFullYear() : currentYear;

  const selectedYear =
    !isNaN(parsedCookieYear) &&
    parsedCookieYear >= minYear &&
    parsedCookieYear <= currentYear
      ? parsedCookieYear
      : currentYear;

  const from = new Date(selectedYear, 0, 1);
  const to = new Date(selectedYear + 1, 0, 1);

  // ── Fetch pilgrims with their latest reservation + offer ──────────────────
  const pigrims = await prisma.user.findMany({
    where: {
      tenantId,
      role: "PILGRIM",
      createdAt: { gte: from, lt: to },
    },
    include: {
      reservations: {
        include: {
          offer: true,
          payments: { orderBy: { paidAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // ── Fetch active offers for the modal dropdown (même année que les pèlerins) ─
  const offers = await prisma.offer.findMany({
    where: { tenantId, active: true, createdAt: { gte: from, lt: to } },
    orderBy: { createdAt: "desc" },
  });

  // ── Serialize (convert Date objects to ISO strings) ───────────────────────
  const serializedPilgrims = pigrims.map((p) => ({
    ...p,
    birthDate: p.birthDate ? p.birthDate.toISOString() : null,
    lastLoginAt: p.lastLoginAt ? p.lastLoginAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    reservations: p.reservations.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      offer: {
        ...r.offer,
        departureDate: r.offer.departureDate ? r.offer.departureDate.toISOString() : null,
        returnDate: r.offer.returnDate ? r.offer.returnDate.toISOString() : null,
        createdAt: r.offer.createdAt.toISOString(),
        updatedAt: r.offer.updatedAt.toISOString(),
      },
      payments: r.payments.map((pay) => ({
        ...pay,
        paidAt:    pay.paidAt.toISOString(),
        createdAt: pay.createdAt.toISOString(),
        updatedAt: pay.updatedAt.toISOString(),
      })),
    })),
  }));

  const serializedOffers = offers.map((o) => ({
    ...o,
    departureDate: o.departureDate ? o.departureDate.toISOString() : null,
    returnDate: o.returnDate ? o.returnDate.toISOString() : null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  return (
    <PilgrimsClient
      pilgrims={serializedPilgrims}
      offers={serializedOffers}
      selectedYear={selectedYear}
      tenantSlug={tenantSlug}
    />
  );
}
