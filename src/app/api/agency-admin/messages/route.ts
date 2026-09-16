import { NextResponse } from "next/server";
import { requireAgencySession, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import {
  MAX_BULK_RECIPIENTS,
  SMS_SOURCES,
  getSmsCounters,
  rangeStart,
  resolveAudience,
  sendBulkSms,
  type SmsRange,
  type SmsRecipient,
} from "@/lib/sms-service";

const MAX_BODY_LENGTH = 640;
const PAGE_SIZE = 50;

// ─── GET /api/agency-admin/messages — historique + compteurs ──────────────────
export async function GET(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;

  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") ?? "30d") as SmsRange;
  const status = searchParams.get("status") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const search = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const start = rangeStart(range);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  const where: Record<string, unknown> = {
    tenantId,
    ...(start ? { createdAt: { gte: start } } : {}),
  };
  if (status && ["SENT", "FAILED", "SKIPPED"].includes(status)) where.status = status;
  if (source && (SMS_SOURCES as readonly string[]).includes(source)) where.source = source;
  if (search) {
    where.OR = [
      { recipientName: { contains: search } },
      { toNormalized: { contains: search } },
      { body: { contains: search } },
    ];
  }

  const [messages, total, counters] = await Promise.all([
    db.smsMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        to: true,
        toNormalized: true,
        recipientName: true,
        recipientId: true,
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
    db.smsMessage.count({ where }),
    getSmsCounters(tenantId, range),
  ]);

  return NextResponse.json({ messages, total, page, pageSize: PAGE_SIZE, counters });
}

// ─── POST /api/agency-admin/messages — envoi individuel ou groupé ─────────────
export async function POST(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  if (!hasPermission(session, "messages:reply")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const tenantId = session.tenantId;

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const body = String(payload.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "Le message est vide" }, { status: 400 });
  if (body.length > MAX_BODY_LENGTH) {
    return NextResponse.json(
      { error: `Message trop long (${MAX_BODY_LENGTH} caractères maximum)` },
      { status: 400 }
    );
  }

  // ── Destinataires ──────────────────────────────────────────────────────────
  let recipients: SmsRecipient[] = [];

  const freePhone = String(payload.phone ?? "").trim();
  if (freePhone) {
    // Numéro libre : envoi individuel hors base pèlerins
    recipients = [{ name: String(payload.name ?? "").trim() || null, phone: freePhone }];
  } else {
    const audience = ["ALL", "VOYAGE", "IDS"].includes(payload.audience)
      ? payload.audience
      : "IDS";
    recipients = await resolveAudience(tenantId, {
      audience,
      voyageId: payload.voyageId ?? null,
      ids: Array.isArray(payload.ids) ? payload.ids : [],
    });
  }

  if (!recipients.length) {
    return NextResponse.json({ error: "Aucun destinataire sélectionné" }, { status: 400 });
  }
  if (recipients.length > MAX_BULK_RECIPIENTS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_BULK_RECIPIENTS} destinataires par envoi` },
      { status: 400 }
    );
  }

  const result = await sendBulkSms({
    tenantId,
    recipients,
    body,
    source: "MANUAL",
    sentById: session.id,
    sentByName: session.name,
  });

  if (result.sent > 0) {
    await logAction({
      session,
      action: "sms.sent",
      resource: "SmsMessage",
      resourceId: result.batchId,
      after: {
        recipients: result.total,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        segments: result.segments,
      },
    });
  }

  return NextResponse.json({
    batchId: result.batchId,
    total: result.total,
    sent: result.sent,
    failed: result.failed,
    skipped: result.skipped,
    segments: result.segments,
    warning: result.warning,
    results: result.results.slice(0, 20),
  });
}
