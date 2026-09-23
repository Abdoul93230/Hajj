import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isAgencyMember } from "@/lib/permissions";
import { resolveTripReturnDate } from "@/lib/documents";
import PilgrimDetailClient, { type Tab } from "./PilgrimDetailClient";

export const metadata: Metadata = { title: "Dossier Pèlerin" };

export default async function PilgrimDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session || !isAgencyMember(session)) redirect("/agency-admin/login");

  const { id } = await params;
  const tenantId = session.tenantId;

  // Onglet initial (Infos / Paiements / Documents) — lu côté serveur pour que
  // le HTML rendu corresponde à l'onglet demandé (pas de mismatch d'hydratation).
  const sp  = await searchParams;
  const raw = typeof sp.tab === "string" ? sp.tab : "";
  const initialTab: Tab = raw === "payments" || raw === "documents" ? raw : "infos";

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

  // Paiements du pèlerin — même forme que la page Paiements (FinancesClient)
  const payments = await prisma.payment.findMany({
    where: { pilgrimId: id, tenantId },
    include: {
      reservation: { include: { offer: true } },
      pilgrim: { select: { id: true, name: true, phone: true, city: true, photoUrl: true } },
    },
    orderBy: { paidAt: "asc" },
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

  const serializedPayments = payments.map((p) => ({
    ...p,
    paidAt:    p.paidAt.toISOString(),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    reservation: {
      ...p.reservation,
      createdAt: p.reservation.createdAt.toISOString(),
      updatedAt: p.reservation.updatedAt.toISOString(),
      offer: {
        ...p.reservation.offer,
        departureDate: p.reservation.offer.departureDate ? p.reservation.offer.departureDate.toISOString() : null,
        returnDate:    p.reservation.offer.returnDate    ? p.reservation.offer.returnDate.toISOString()    : null,
        createdAt:     p.reservation.offer.createdAt.toISOString(),
        updatedAt:     p.reservation.offer.updatedAt.toISOString(),
      },
    },
  }));

  // Ligne au format DocumentsClient, documents TOUS statuts (hors vaccin)
  const docsRow = {
    id:            pilgrim.id,
    name:          pilgrim.name,
    phone:         pilgrim.phone,
    photoUrl:      pilgrim.photoUrl,
    gender:        pilgrim.gender,
    pilgrimStatus: pilgrim.pilgrimStatus,
    hasPassport:   pilgrim.hasPassport,
    hasCni:        pilgrim.hasCni,
    // Date de retour du voyage : référence de la règle passeport (6 mois après)
    returnDate:    resolveTripReturnDate(pilgrim.reservations[0]?.offer)?.toISOString() ?? null,
    documents: pilgrim.documents
      .filter((d) => d.type !== "VACCINE")
      .map((d) => ({
        id: d.id,
        type: d.type as "PASSPORT" | "CNI" | "VISA" | "PHOTO" | "OTHER",
        status: d.status as "RECEIVED" | "VALID" | "EXPIRED" | "REJECTED",
        label: d.label,
        fileUrl: d.fileUrl,
        expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
        notes: d.notes,
        createdAt: d.createdAt.toISOString(),
      })),
  };

  return (
    <PilgrimDetailClient
      pilgrim={JSON.parse(JSON.stringify(serialized))}
      offers={JSON.parse(JSON.stringify(serializedOffers))}
      selectedYear={selectedYear}
      financePayments={JSON.parse(JSON.stringify(serializedPayments))}
      financePilgrim={JSON.parse(JSON.stringify(serialized))}
      docsRow={JSON.parse(JSON.stringify(docsRow))}
      initialTab={initialTab}
    />
  );
}
