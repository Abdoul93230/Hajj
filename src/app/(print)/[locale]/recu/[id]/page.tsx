import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import ReceiptView from "@/components/receipt/ReceiptView";

// Reçu de paiement côté pèlerin — même rendu que la version agence
// (src/app/(agency-admin)/agency-admin/receipt/[id]) mais accès limité aux
// paiements du pèlerin connecté (pilgrimId = session.id, tenantId = session.tenantId).
export default async function PilgrimReceiptPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await getSession();
  if (!session || session.role !== "PILGRIM") redirect(`/${locale}/compte`);

  const tenantId = session.tenantId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  // Uniquement les paiements DU pèlerin connecté
  const payment = await db.payment.findFirst({
    where: { id, tenantId, pilgrimId: session.id },
    include: {
      reservation: {
        include: { offer: true },
      },
      pilgrim: {
        select: { id: true, name: true, phone: true, city: true, country: true },
      },
    },
  });

  if (!payment) notFound();

  // Snapshot : paiements COMPLETED enregistrés avant ou en même temps que celui-ci
  // (même logique que la version agence — cohérence du solde affiché sur le reçu)
  const allPayments = await db.payment.findMany({
    where: {
      tenantId,
      pilgrimId: session.id,
      status: "COMPLETED",
      createdAt: { lte: new Date(payment.createdAt) },
    },
    orderBy: { createdAt: "asc" },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, email: true, phone: true, address: true, theme: true },
  });

  const totalAmount =
    payment.reservation.totalAmount ?? payment.reservation.offer.priceAdult ?? 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPaid = allPayments.reduce((s: number, p: any) =>
    p.type === "REFUND" ? s - p.amount : s + p.amount, 0);

  // Solde AVANT ce versement (paiements strictement antérieurs)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paidBefore = allPayments.reduce((s: number, p: any) => {
    if (p.id === payment.id) return s;
    return p.type === "REFUND" ? s - p.amount : s + p.amount;
  }, 0);

  const remaining = Math.max(0, totalAmount - totalPaid);

  const serial = {
    ...payment,
    paidAt:    new Date(payment.paidAt).toISOString(),
    createdAt: new Date(payment.createdAt).toISOString(),
    reservation: {
      ...payment.reservation,
      offer: {
        ...payment.reservation.offer,
        departureDate: payment.reservation.offer.departureDate
          ? new Date(payment.reservation.offer.departureDate).toISOString()
          : null,
      },
    },
  };

  return (
    <ReceiptView
      payment={JSON.parse(JSON.stringify(serial))}
      tenant={tenant ?? { name: "Agence", email: "", phone: null, address: null, theme: null }}
      totalAmount={totalAmount}
      paidBefore={paidBefore}
      totalPaid={totalPaid}
      remaining={remaining}
      copies={1}
    />
  );
}