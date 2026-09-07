import { NextResponse } from "next/server";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { computePilgrimStatus } from "@/lib/computePilgrimStatus";

// ─── Helper : recalcule et persiste le pilgrimStatus après tout changement ────
async function syncPilgrimStatus(pilgrimId: string, tenantId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const pilgrim = await prisma.user.findFirst({
    where: { id: pilgrimId, tenantId, role: "PILGRIM" },
    select: { pilgrimStatus: true, reservations: { select: { totalAmount: true, offer: { select: { priceAdult: true, departureDate: true, returnDate: true } } }, take: 1, orderBy: { createdAt: "desc" } } },
  });
  if (!pilgrim) return;

  const res   = pilgrim.reservations[0];
  const total = res?.totalAmount ?? res?.offer?.priceAdult ?? 0;

  const payments = await db.payment.findMany({
    where: { pilgrimId, tenantId, status: "COMPLETED" },
    select: { amount: true, type: true },
  });
  const paid = payments.reduce((s: number, p: { amount: number; type: string }) =>
    p.type === "REFUND" ? s - p.amount : s + p.amount, 0);

  const newStatus = computePilgrimStatus(paid, total, pilgrim.pilgrimStatus, {
    departureDate: res?.offer?.departureDate ?? null,
    returnDate:    res?.offer?.returnDate    ?? null,
  });
  if (newStatus !== pilgrim.pilgrimStatus) {
    await prisma.user.update({ where: { id: pilgrimId }, data: { pilgrimStatus: newStatus } });
  }
}

// ─── PATCH /api/agency-admin/payments/[id] ───────────────────────────────────
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const existing = await db.payment.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });

  const body = await req.json();
  const { amount, type, method, reference, notes, paidAt } = body;

  const payment = await db.payment.update({
    where: { id },
    data: {
      ...(amount    !== undefined && { amount:    parseFloat(String(amount)) }),
      ...(type      !== undefined && { type }),
      ...(method    !== undefined && { method }),
      ...(reference !== undefined && { reference: reference?.trim() || null }),
      ...(notes     !== undefined && { notes:     notes?.trim()     || null }),
      ...(paidAt    !== undefined && { paidAt:    new Date(paidAt)  }),
    },
    include: {
      reservation: { include: { offer: true } },
      pilgrim:     { select: { id: true, name: true, phone: true } },
    },
  });

  if (existing.pilgrimId) await syncPilgrimStatus(existing.pilgrimId, tenantId);

  return NextResponse.json({ payment });
}

// ─── DELETE /api/agency-admin/payments/[id] ──────────────────────────────────
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const existing = await db.payment.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });

  await db.payment.delete({ where: { id } });

  // Recalcul après suppression
  if (existing.pilgrimId) await syncPilgrimStatus(existing.pilgrimId, tenantId);

  return NextResponse.json({ ok: true });
}
