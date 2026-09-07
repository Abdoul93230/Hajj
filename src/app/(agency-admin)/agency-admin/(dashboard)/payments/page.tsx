import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import FinancesClient from "./FinancesClient";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, error } = await requireAgencySession();
  if (error || !session) redirect("/agency-admin/login");
  const tenantId = session.tenantId;

  const sp = await searchParams;
  const initialPilgrimId = typeof sp.pilgrimId === "string" ? sp.pilgrimId : undefined;
  const initialAction    = typeof sp.action    === "string" ? sp.action    : undefined;

  // ── Année sélectionnée ────────────────────────────────────────────────────
  const cookieStore  = await cookies();
  const cookieYear   = cookieStore.get("zam_selected_year")?.value;
  const currentYear  = new Date().getFullYear();
  const parsedYear   = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;

  const from = new Date(selectedYear, 0, 1);
  const to   = new Date(selectedYear + 1, 0, 1);
  // ─────────────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const [payments, pilgrims, offers] = await Promise.all([
    // Paiements encaissés/annulés dans l'année (pour références futures si besoin)
    // Les stats et cartes utilisent les paiements imbriqués dans pilgrims (sans filtre date)
    db.payment.findMany({
      where: { tenantId, paidAt: { gte: from, lt: to } },
      include: {
        reservation: { include: { offer: true } },
        pilgrim: { select: { id: true, name: true, phone: true, city: true } },
      },
      orderBy: { paidAt: "asc" },
    }),

    // Pèlerins de l'année avec réservations (pour la grille + modal)
    prisma.user.findMany({
      where: { tenantId, role: "PILGRIM", active: true, createdAt: { gte: from, lt: to } },
      include: {
        reservations: {
          include: {
            offer: {
              select: { id: true, titleFr: true, currency: true, priceAdult: true },
            },
            payments: { orderBy: { paidAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),

    // Offres dont le départ est dans l'année sélectionnée
    // (ou sans date de départ — on les inclut aussi)
    prisma.offer.findMany({
      where: {
        tenantId,
        active: true,
        OR: [
          { departureDate: { gte: from, lt: to } },
          { departureDate: null },
        ],
      },
      select: { id: true, titleFr: true, currency: true, priceAdult: true },
      orderBy: { departureDate: "asc" },
    }),
  ]);

  return (
    <FinancesClient
      payments={JSON.parse(JSON.stringify(payments))}
      pilgrims={JSON.parse(JSON.stringify(pilgrims))}
      offers={JSON.parse(JSON.stringify(offers))}
      selectedYear={selectedYear}
      initialPilgrimId={initialPilgrimId}
      initialAction={initialAction}
    />
  );
}
