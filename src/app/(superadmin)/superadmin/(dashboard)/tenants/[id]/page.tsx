import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TenantInspectClient from "./TenantInspectClient";

export const metadata: Metadata = { title: "Inspection agence" };

export default async function TenantInspectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = sp.year ? parseInt(sp.year, 10) : currentYear;

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

  if (!tenant || tenant.status === "PLATFORM") notFound();

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
      take: 6,
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

  // Agréger pilgrimsByStatus côté JS (groupBy non supporté sur MongoDB avec filtre null)
  const pilgrimsByStatus = Object.entries(
    pilgrimStatusRows.reduce<Record<string, number>>((acc, { pilgrimStatus }) => {
      const key = pilgrimStatus ?? "PENDING";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ status, count }));

  // Années disponibles depuis createdAt du tenant
  const minYear = tenant.createdAt.getFullYear();
  const availableYears: number[] = [];
  for (let y = currentYear; y >= minYear; y--) availableYears.push(y);

  const data = {
    tenant: {
      ...tenant,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
      theme: tenant.theme as Record<string, string> | null,
    },
    year,
    availableYears,
    stats: {
      pilgrimsThisYear,
      confirmedThisYear,
      pendingThisYear,
      cancelledThisYear,
      offersThisYear,
      totalRevenue: revenueAgg._sum.totalAmount ?? 0,
    },
    pilgrimsByStatus,
    recentPilgrims: recentPilgrims.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
    recentOffers: recentOffers.map((o) => ({
      id: o.id,
      titleFr: o.titleFr,
      type: o.type,
      priceAdult: o.priceAdult,
      departureDate: o.departureDate?.toISOString() ?? null,
      returnDate: o.returnDate?.toISOString() ?? null,
      confirmedCount: o._count.reservations,
      data: o.data as { maxCapacity?: number } | null,
    })),
  };

  return <TenantInspectClient {...data} />;
}
