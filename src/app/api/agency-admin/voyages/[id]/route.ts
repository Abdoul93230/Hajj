import { NextResponse } from "next/server";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// ─── PUT /api/agency-admin/voyages/[id] ──────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { id } = await params;

  const existing = await prisma.offer.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
  }

  const body = await req.json();
  const {
    titleFr,
    type,
    descFr,
    departureDate,
    returnDate,
    priceAdult,
    priceBaby,
    priceChild,
    priceCouple,
    currency,
    maxCapacity,
    provisional,
  } = body;

  const updated = await prisma.offer.update({
    where: { id },
    data: {
      ...(titleFr !== undefined && { titleFr: titleFr.trim() }),
      ...(type !== undefined && { type }),
      ...(descFr !== undefined && { descFr: descFr.trim() }),
      ...(departureDate !== undefined && {
        departureDate: departureDate ? new Date(departureDate) : null,
      }),
      ...(returnDate !== undefined && {
        returnDate: returnDate ? new Date(returnDate) : null,
      }),
      ...(priceAdult !== undefined && { priceAdult: Number(priceAdult) }),
      ...(priceBaby !== undefined && {
        priceBaby: priceBaby !== "" && priceBaby !== null ? Number(priceBaby) : null,
      }),
      ...(priceChild !== undefined && {
        priceChild: priceChild !== "" && priceChild !== null ? Number(priceChild) : null,
      }),
      ...(priceCouple !== undefined && {
        priceCouple: priceCouple !== "" && priceCouple !== null ? Number(priceCouple) : null,
      }),
      ...(currency !== undefined && { currency }),
      ...(provisional !== undefined && { provisional }),
      ...(maxCapacity !== undefined && {
        data:
          maxCapacity !== "" && maxCapacity !== null
            ? { maxCapacity: Number(maxCapacity) }
            : existing.data ?? undefined,
      }),
    },
    include: {
      _count: {
        select: {
          reservations: { where: { status: "CONFIRMED" } },
        },
      },
    },
  });

  return NextResponse.json({
    offer: {
      ...updated,
      confirmedCount: updated._count.reservations,
      maxCapacity:
        updated.data && typeof updated.data === "object" && "maxCapacity" in (updated.data as object)
          ? (updated.data as { maxCapacity: number }).maxCapacity
          : 0,
    },
  });
}

// ─── DELETE /api/agency-admin/voyages/[id] ───────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { id } = await params;

  const existing = await prisma.offer.findFirst({
    where: { id, tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Voyage introuvable" }, { status: 404 });
  }

  await prisma.offer.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
