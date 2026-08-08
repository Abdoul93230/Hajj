import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// GET /api/agency-admin/voyages/[id]/pilgrims
// Retourne les pèlerins inscrits + les pèlerins disponibles pour ce voyage/année
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { id: offerId } = await params;

  // Vérifier que le voyage appartient au tenant
  const offer = await prisma.offer.findFirst({ where: { id: offerId, tenantId } });
  if (!offer) return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });

  // Année sélectionnée
  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const currentYear = new Date().getFullYear();
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;
  const from = new Date(selectedYear, 0, 1);
  const to   = new Date(selectedYear + 1, 0, 1);

  // Pèlerins inscrits sur CE voyage
  const enrolledReservations = await prisma.reservation.findMany({
    where: { tenantId, offerId, status: "CONFIRMED" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          gender: true,
          pilgrimStatus: true,
          hasPassport: true,
          hasCni: true,
          hasVaccine: true,
          photoUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Pèlerins de l'année sans réservation sur ce voyage (disponibles)
  // Récupérer IDs des pèlerins déjà inscrits
  const enrolledUserIds = enrolledReservations
    .map((r) => r.userId)
    .filter((id): id is string => !!id);

  const available = await prisma.user.findMany({
    where: {
      tenantId,
      role: "PILGRIM",
      active: true,
      createdAt: { gte: from, lt: to },
      id: { notIn: enrolledUserIds },
    },
    select: {
      id: true,
      name: true,
      phone: true,
      gender: true,
      pilgrimStatus: true,
      hasPassport: true,
      hasCni: true,
      hasVaccine: true,
      photoUrl: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    enrolled: enrolledReservations.map((r) => ({
      reservationId: r.id,
      totalAmount: r.totalAmount,
      ...r.user,
    })),
    available,
  });
}
