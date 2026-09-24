import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveTripReturnDate } from "@/lib/documents";
import DocumentsPortalClient from "./DocumentsPortalClient";

export default async function MesDocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await getTranslations("portal");
  const session = await getSession();
  if (!session || session.role !== "PILGRIM") redirect(`/${locale}/compte`);

  const docs = await prisma.pilgrimDocument.findMany({
    where: { tenantId: session.tenantId, userId: session.id },
    orderBy: { createdAt: "desc" },
  });

  // Sérialisation pour le composant client
  const serialized = docs.map((d) => ({
    id: d.id,
    type: d.type as string,
    status: d.status as string,
    label: d.label,
    fileUrl: d.fileUrl,
    expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
    notes: d.notes,
    number: d.number,
  }));

  // Voyage du pèlerin : sert de référence à la règle « passeport valide 6 mois
  // après le retour » (contrôle aussi appliqué côté API).
  const reservation = await prisma.reservation.findFirst({
    where: { tenantId: session.tenantId, userId: session.id },
    orderBy: { createdAt: "desc" },
    select: { offer: { select: { departureDate: true, returnDate: true } } },
  });

  return (
    <DocumentsPortalClient
      docs={serialized}
      returnDate={resolveTripReturnDate(reservation?.offer)?.toISOString() ?? null}
    />
  );
}
