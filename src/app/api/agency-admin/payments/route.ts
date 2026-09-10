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

// ─── GET /api/agency-admin/payments ──────────────────────────────────────────
export async function GET(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;

  const { searchParams } = new URL(req.url);
  const offerId   = searchParams.get("offerId")   ?? undefined;
  const pilgrimId = searchParams.get("pilgrimId") ?? undefined;
  const type      = searchParams.get("type")      ?? undefined;
  const method    = searchParams.get("method")    ?? undefined;
  const status    = searchParams.get("status")    ?? undefined;
  const from      = searchParams.get("from")  ? new Date(searchParams.get("from")!) : undefined;
  const to        = searchParams.get("to")    ? new Date(searchParams.get("to")! + "T23:59:59") : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const where: Record<string, unknown> = { tenantId };
  if (type)      where.type      = type;
  if (method)    where.method    = method;
  if (status)    where.status    = status;
  if (pilgrimId) where.pilgrimId = pilgrimId;
  if (from || to) where.paidAt   = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  if (offerId)   where.reservation = { offerId };

  const payments = await db.payment.findMany({
    where,
    include: {
      reservation: { include: { offer: true } },
      pilgrim:     { select: { id: true, name: true, phone: true, city: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  return NextResponse.json({ payments });
}

// ─── Génération automatique de référence / reçu ──────────────────────────────
// Format : REC-<année>-<5 caractères aléatoires> (ex: REC-2026-K7X2F)
// Unicité vérifiée au sein du tenant.
async function generateReference(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I/L/O/0/1 (ambigus)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  for (let attempt = 0; attempt < 5; attempt++) {
    let suffix = "";
    for (let i = 0; i < 5; i++) {
      suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    const reference = `REC-${year}-${suffix}`;
    const existing = await db.payment.findFirst({
      where: { tenantId, reference },
      select: { id: true },
    });
    if (!existing) return reference;
  }
  // Fallback quasi-impossible (5 collisions) : horodatage
  return `REC-${year}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// ─── POST /api/agency-admin/payments ─────────────────────────────────────────
export async function POST(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;

  const body = await req.json();
  const { reservationId, pilgrimId, amount, type, method, reference, notes, paidAt } = body;

  if (!reservationId)         return NextResponse.json({ error: "reservationId requis" },    { status: 400 });
  if (!amount || amount <= 0) return NextResponse.json({ error: "Montant invalide" },         { status: 400 });
  if (!type)                  return NextResponse.json({ error: "Type de paiement requis" }, { status: 400 });

  const reservation = await prisma.reservation.findFirst({ where: { id: reservationId, tenantId } });
  if (!reservation) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;
  const resolvedPilgrimId = pilgrimId || reservation.userId || null;

  // Référence auto-générée si l'admin n'en saisit pas une
  const finalReference = reference?.trim() || (await generateReference(tenantId));

  const payment = await db.payment.create({
    data: {
      tenantId,
      reservationId,
      pilgrimId:  resolvedPilgrimId,
      amount:     parseFloat(String(amount)),
      type,
      method:     method    || "CASH",
      status:     "COMPLETED",
      reference:  finalReference,
      notes:      notes?.trim()     || null,
      paidAt:     paidAt ? new Date(paidAt) : new Date(),
      createdBy:  session.id,
    },
    include: {
      reservation: { include: { offer: true } },
      pilgrim:     { select: { id: true, name: true, phone: true } },
    },
  });

  // Recalcul automatique du statut pèlerin
  if (resolvedPilgrimId) await syncPilgrimStatus(resolvedPilgrimId, tenantId);

  return NextResponse.json({ payment }, { status: 201 });
}
