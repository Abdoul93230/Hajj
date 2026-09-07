import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isAgencyMember } from "@/lib/permissions";
import ReceiptView from "./ReceiptView";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !isAgencyMember(session)) redirect("/agency-admin/login");

  const { id } = await params;
  const tenantId = session.tenantId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const payment = await db.payment.findFirst({
    where: { id, tenantId },
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

  // Snapshot : paiements COMPLETED enregistrés AVANT ou EN MÊME TEMPS que ce paiement.
  // On utilise createdAt (timestamp serveur, immuable) et non paidAt (date saisie manuellement).
  // Cela garantit que le reçu reflète toujours l'état du dossier au moment exact de l'enregistrement,
  // même si des versements ultérieurs sont ajoutés rétroactivement avec des paidAt antérieurs.
  const allPayments = payment.pilgrimId
    ? await db.payment.findMany({
        where: {
          tenantId,
          pilgrimId: payment.pilgrimId,
          status: "COMPLETED",
          createdAt: { lte: new Date(payment.createdAt) },
        },
        orderBy: { createdAt: "asc" },
      })
    : [payment];

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
    if (p.id === payment.id) return s; // exclure le paiement courant
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
    />
  );
}
