import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? String(new Date().getFullYear()), 10);

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: { where: { role: { not: "SUPER_ADMIN" }, active: true } },
          reservations: true,
          offers: { where: { active: true } },
        },
      },
    },
  });
  if (!tenant || tenant.status === "PLATFORM") {
    return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });
  }

  const from = new Date(year, 0, 1);
  const to   = new Date(year + 1, 0, 1);
  const yearFilter = { gte: from, lt: to };

  const [
    pilgrimsThisYear,
    confirmedThisYear,
    pendingThisYear,
    cancelledThisYear,
    offersThisYear,
    recentPilgrims,
    recentOffers,
    pilgrimStatusRows,
    revenueAgg,
  ] = await Promise.all([
    prisma.user.count({ where: { tenantId: id, role: "PILGRIM", active: true, createdAt: yearFilter } }),
    prisma.reservation.count({ where: { tenantId: id, status: "CONFIRMED", createdAt: yearFilter } }),
    prisma.reservation.count({ where: { tenantId: id, status: "PENDING", createdAt: yearFilter } }),
    prisma.reservation.count({ where: { tenantId: id, status: "CANCELLED", createdAt: yearFilter } }),
    prisma.offer.count({ where: { tenantId: id, active: true, createdAt: yearFilter } }),
    prisma.user.findMany({
      where: { tenantId: id, role: "PILGRIM", active: true, createdAt: yearFilter },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, city: true, country: true, pilgrimStatus: true, hasPassport: true, hasCni: true, hasVaccine: true, createdAt: true },
    }),
    prisma.offer.findMany({
      where: { tenantId: id, active: true, createdAt: yearFilter },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: { select: { reservations: { where: { status: "CONFIRMED" } } } },
      },
    }),
    prisma.user.findMany({
      where: { tenantId: id, role: "PILGRIM", active: true, createdAt: yearFilter },
      select: { pilgrimStatus: true },
    }),
    prisma.reservation.aggregate({
      where: { tenantId: id, status: "CONFIRMED", createdAt: yearFilter },
      _sum: { totalAmount: true },
    }),
  ]);

  // Agréger statuts côté JS (groupBy non supporté avec filtre null sur MongoDB)
  const pilgrimsByStatus = Object.entries(
    pilgrimStatusRows.reduce<Record<string, number>>((acc, { pilgrimStatus }) => {
      const key = pilgrimStatus ?? "PENDING";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ status, count }));

  return NextResponse.json({
    tenant: {
      ...tenant,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
    },
    year,
    stats: {
      pilgrimsThisYear,
      confirmedThisYear,
      pendingThisYear,
      cancelledThisYear,
      offersThisYear,
      totalRevenue: revenueAgg._sum.totalAmount ?? 0,
    },
    pilgrimsByStatus,
    recentPilgrims: recentPilgrims.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
    recentOffers: recentOffers.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      departureDate: o.departureDate?.toISOString() ?? null,
      returnDate: o.returnDate?.toISOString() ?? null,
      confirmedCount: o._count.reservations,
    })),
  });
}
