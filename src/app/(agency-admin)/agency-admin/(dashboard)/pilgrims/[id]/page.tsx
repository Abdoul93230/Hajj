import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isAgencyMember } from "@/lib/permissions";
import PilgrimDetailClient from "./PilgrimDetailClient";

export const metadata: Metadata = { title: "Dossier Pèlerin" };

export default async function PilgrimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !isAgencyMember(session)) redirect("/agency-admin/login");

  const { id } = await params;
  const tenantId = session.tenantId;

  const pilgrim = await prisma.user.findFirst({
    where: { id, tenantId, role: "PILGRIM" },
    include: {
      reservations: {
        include: {
          offer: true,
          payments: { orderBy: { paidAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
      documents: {
        where: { status: { in: ["RECEIVED", "VALID"] } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!pilgrim) notFound();

  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const currentYear = new Date().getFullYear();
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;

  const offers = await prisma.offer.findMany({
    where: { tenantId, active: true },
    orderBy: { createdAt: "desc" },
  });

  const serialized = {
    ...pilgrim,
    birthDate:   pilgrim.birthDate   ? pilgrim.birthDate.toISOString()   : null,
    lastLoginAt: pilgrim.lastLoginAt ? pilgrim.lastLoginAt.toISOString() : null,
    createdAt:   pilgrim.createdAt.toISOString(),
    updatedAt:   pilgrim.updatedAt.toISOString(),
    reservations: pilgrim.reservations.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      offer: {
        ...r.offer,
        departureDate: r.offer.departureDate ? r.offer.departureDate.toISOString() : null,
        returnDate:    r.offer.returnDate    ? r.offer.returnDate.toISOString()    : null,
        createdAt:     r.offer.createdAt.toISOString(),
        updatedAt:     r.offer.updatedAt.toISOString(),
      },
      payments: r.payments.map((p) => ({
        ...p,
        paidAt:    p.paidAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    })),
    documents: pilgrim.documents.map((d) => ({
      ...d,
      expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
  };

  const serializedOffers = offers.map((o) => ({
    ...o,
    departureDate: o.departureDate ? o.departureDate.toISOString() : null,
    returnDate:    o.returnDate    ? o.returnDate.toISOString()    : null,
    createdAt:     o.createdAt.toISOString(),
    updatedAt:     o.updatedAt.toISOString(),
  }));

  return (
    <PilgrimDetailClient
      pilgrim={JSON.parse(JSON.stringify(serialized))}
      offers={JSON.parse(JSON.stringify(serializedOffers))}
      selectedYear={selectedYear}
    />
  );
}
