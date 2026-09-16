import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getSmsConfig, isSmsConfigured } from "@/lib/sms";
import { getSmsCounters } from "@/lib/sms-service";
import MessagesClient from "./MessagesClient";

export const metadata: Metadata = { title: "Messages SMS" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session, error } = await requireAgencySession();
  if (error || !session) redirect("/agency-admin/login");
  const tenantId = session.tenantId;

  const sp = await searchParams;
  const initialPilgrimId = typeof sp.pilgrim === "string" ? sp.pilgrim : undefined;

  // ── Année sélectionnée (même mécanique que Pèlerins / Paiements) ──────────
  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const currentYear = new Date().getFullYear();
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;

  const from = new Date(selectedYear, 0, 1);
  const to = new Date(selectedYear + 1, 0, 1);
  // ─────────────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const [pilgrims, offers, reservations, counters, history] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, role: "PILGRIM", active: true, createdAt: { gte: from, lt: to } },
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.offer.findMany({
      where: { tenantId, active: true, createdAt: { gte: from, lt: to } },
      select: { id: true, titleFr: true, departureDate: true },
      orderBy: { departureDate: "desc" },
    }),
    prisma.reservation.findMany({
      where: { tenantId, userId: { not: null } },
      select: { offerId: true, userId: true },
    }),
    getSmsCounters(tenantId, "30d"),
    db.smsMessage.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        to: true,
        toNormalized: true,
        recipientName: true,
        recipientId: true,
        channel: true,
        body: true,
        segments: true,
        source: true,
        batchId: true,
        status: true,
        error: true,
        sentByName: true,
        createdAt: true,
      },
    }),
  ]);

  // Regroupe les pèlerins par voyage (sélection « Par voyage »)
  const voyageMembers = new Map<string, string[]>();
  for (const reservation of reservations) {
    if (!reservation.userId) continue;
    const list = voyageMembers.get(reservation.offerId) ?? [];
    if (!list.includes(reservation.userId)) list.push(reservation.userId);
    voyageMembers.set(reservation.offerId, list);
  }

  return (
    <MessagesClient
      pilgrims={pilgrims}
      voyages={offers.map((offer) => ({
        id: offer.id,
        title: offer.titleFr,
        departureDate: offer.departureDate ? offer.departureDate.toISOString() : null,
        pilgrimIds: voyageMembers.get(offer.id) ?? [],
      }))}
      initialMessages={history.map((message: Record<string, unknown>) => ({
        ...message,
        createdAt: new Date(message.createdAt as string).toISOString(),
      }))}
      counters={{
        month: counters.month.sent,
        monthFailed: counters.month.failed,
        monthSkipped: counters.month.skipped,
        total: counters.all.sent,
        lastSentAt: counters.all.lastSentAt,
      }}
      sender={getSmsConfig().sender}
      configured={isSmsConfigured()}
      initialPilgrimId={initialPilgrimId}
      selectedYear={selectedYear}
    />
  );
}
