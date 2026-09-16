import "server-only";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  countSmsSegments,
  getSmsConfig,
  isSmsConfigured,
  normalizePhone,
  sendSms,
  smsErrorMessage,
} from "@/lib/sms";
// Constantes, libellés, modèles et formatage : définis dans `sms-segments.ts`
// (module sans "server-only", donc utilisable aussi par les composants client).
import {
  MAX_BULK_RECIPIENTS,
  SMS_SOURCES,
  SMS_SOURCE_LABELS,
  SMS_STATUS_LABELS,
  SMS_TEMPLATES,
  SMS_VARIABLES,
  formatAmount,
  renderTemplate,
} from "@/lib/sms-segments";
import type { SmsRecipient, SmsSource, SmsStatus } from "@/lib/sms-segments";

export {
  MAX_BULK_RECIPIENTS,
  SMS_SOURCES,
  SMS_SOURCE_LABELS,
  SMS_STATUS_LABELS,
  SMS_TEMPLATES,
  SMS_VARIABLES,
  formatAmount,
  renderTemplate,
};
export type { SmsRecipient, SmsSource, SmsStatus } from "@/lib/sms-segments";

/**
 * Service SMS : la logique métier au-dessus du transport (`src/lib/sms.ts`).
 *  - journalise CHAQUE tentative dans SmsMessage (page agence + compteurs superadmin)
 *  - ne bloque JAMAIS une action métier : les automatismes sont planifiés via after()
 *  - 2 automatismes : création de compte pèlerin (2 SMS) et versement (2 SMS)
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export type SmsSendResult = {
  to: string | null;
  name: string | null;
  status: SmsStatus;
  segments: number;
  error?: string;
};

export type SmsBatchResult = {
  batchId: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  segments: number;
  warning?: string;
  results: SmsSendResult[];
};

export type SmsAudience = "ALL" | "VOYAGE" | "IDS";

export type SmsRange = "today" | "7d" | "30d" | "all";

export type SmsCounters = {
  sent: number;
  failed: number;
  skipped: number;
  segments: number;
  lastSentAt: string | null;
};

// Helpers

function newBatchId(): string {
  return `sms_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Début de période pour les filtres de la page Messages. */
export function rangeStart(range: SmsRange): Date | null {
  const now = new Date();
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

async function insertLog(db: Db, data: Record<string, unknown>): Promise<void> {
  try {
    await db.smsMessage.create({ data });
  } catch {
    // Le journal ne doit jamais faire échouer un envoi
  }
}

// Envoi unitaire (journalisé)

/**
 * Envoie un SMS à UN destinataire et journalise le résultat.
 *  - pas de numéro exploitable : status SKIPPED (0 crédit consommé)
 *  - SMS non configuré         : status SKIPPED
 *  - erreur opérateur          : status FAILED
 */
export async function deliverSms(opts: {
  tenantId: string;
  recipient: SmsRecipient;
  body: string;
  source: SmsSource;
  batchId?: string | null;
  sentById?: string | null;
  sentByName?: string | null;
}): Promise<SmsSendResult> {
  const db = prisma as Db;
  const config = getSmsConfig();

  const rawPhone = String(opts.recipient.phone ?? "").trim();
  const target = normalizePhone(rawPhone);
  const content = String(opts.body ?? "").trim();
  const name = opts.recipient.name ?? null;

  const base = {
    tenantId: opts.tenantId,
    to: rawPhone,
    toNormalized: target ?? rawPhone,
    recipientName: name,
    recipientId: opts.recipient.userId ?? null,
    body: content,
    source: opts.source,
    batchId: opts.batchId ?? null,
    sender: config.sender,
    sentById: opts.sentById ?? null,
    sentByName: opts.sentByName ?? null,
  };

  if (!content) {
    const error = "Message vide";
    await insertLog(db, { ...base, segments: 0, status: "SKIPPED", error });
    return { to: rawPhone || null, name, status: "SKIPPED", segments: 0, error };
  }

  if (!target) {
    const error = rawPhone ? "Numéro inexploitable" : "Aucun numéro";
    await insertLog(db, { ...base, segments: 0, status: "SKIPPED", error });
    return { to: rawPhone || null, name, status: "SKIPPED", segments: 0, error };
  }

  if (!isSmsConfigured()) {
    const error = "Envoi SMS non configuré";
    await insertLog(db, { ...base, segments: 0, status: "SKIPPED", error });
    return { to: target, name, status: "SKIPPED", segments: 0, error };
  }

  const segments = countSmsSegments(content);

  try {
    const { providerMessageId } = await sendSms({ to: target, text: content });
    await insertLog(db, { ...base, segments, status: "SENT", providerMessageId });
    return { to: target, name, status: "SENT", segments };
  } catch (err) {
    const error = smsErrorMessage(err);
    await insertLog(db, { ...base, segments, status: "FAILED", error });
    return { to: target, name, status: "FAILED", segments, error };
  }
}

// Envoi groupé

/**
 * Envoie le même message à plusieurs destinataires.
 *  - déduplication par numéro normalisé (un numéro = un seul SMS)
 *  - plafond MAX_BULK_RECIPIENTS
 *  - envoi séquentiel (un appel opérateur par destinataire)
 */
export async function sendBulkSms(opts: {
  tenantId: string;
  recipients: SmsRecipient[];
  body: string;
  source: SmsSource;
  sentById?: string | null;
  sentByName?: string | null;
}): Promise<SmsBatchResult> {
  const batchId = newBatchId();
  const seen = new Set<string>();
  const unique: SmsRecipient[] = [];

  for (const recipient of opts.recipients) {
    const key =
      normalizePhone(recipient.phone) ?? `sans-numero:${recipient.userId ?? unique.length}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(recipient);
  }

  const limited = unique.slice(0, MAX_BULK_RECIPIENTS);
  const results: SmsSendResult[] = [];

  for (const recipient of limited) {
    results.push(
      await deliverSms({
        tenantId: opts.tenantId,
        recipient,
        body: opts.body,
        source: opts.source,
        batchId,
        sentById: opts.sentById,
        sentByName: opts.sentByName,
      })
    );
  }

  return {
    batchId,
    total: results.length,
    sent: results.filter((r) => r.status === "SENT").length,
    failed: results.filter((r) => r.status === "FAILED").length,
    skipped: results.filter((r) => r.status === "SKIPPED").length,
    segments: results.reduce((sum, r) => sum + r.segments, 0),
    warning:
      unique.length > MAX_BULK_RECIPIENTS
        ? `Envoi limité à ${MAX_BULK_RECIPIENTS} destinataires sur ${unique.length}.`
        : undefined,
    results,
  };
}

// Résolution des destinataires

const PILGRIM_SELECT = { id: true, name: true, phone: true } as const;

/**
 * Pèlerins d'une audience :
 *  ALL    = tous les pèlerins actifs de l'agence
 *  VOYAGE = pèlerins ayant une réservation sur cette offre
 *  IDS    = sélection manuelle (cochage)
 */
export async function resolveAudience(
  tenantId: string,
  filter: { audience: SmsAudience; voyageId?: string | null; ids?: string[] }
): Promise<SmsRecipient[]> {
  if (filter.audience === "IDS") {
    const ids = (filter.ids ?? []).filter(Boolean);
    if (!ids.length) return [];
    const users = await prisma.user.findMany({
      where: { tenantId, role: "PILGRIM", id: { in: ids } },
      select: PILGRIM_SELECT,
    });
    return users.map((u) => ({ userId: u.id, name: u.name, phone: u.phone }));
  }

  if (filter.audience === "VOYAGE") {
    if (!filter.voyageId) return [];
    const reservations = await prisma.reservation.findMany({
      where: { tenantId, offerId: filter.voyageId, userId: { not: null } },
      select: { user: { select: PILGRIM_SELECT } },
    });
    return reservations
      .map((r) => r.user)
      .filter((u): u is { id: string; name: string; phone: string | null } => !!u)
      .map((u) => ({ userId: u.id, name: u.name, phone: u.phone }));
  }

  const users = await prisma.user.findMany({
    where: { tenantId, role: "PILGRIM", active: true },
    select: PILGRIM_SELECT,
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({ userId: u.id, name: u.name, phone: u.phone }));
}

/**
 * Destinataires « côté agence » (copie des automatismes) : le numéro de
 * l'agence, puis les administrateurs actifs ayant un numéro.
 */
export async function resolveAgencyRecipients(tenantId: string): Promise<SmsRecipient[]> {
  const [tenant, admins] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, phone: true } }),
    prisma.user.findMany({
      where: { tenantId, role: "AGENCY_ADMIN", active: true, phone: { not: null } },
      select: { id: true, name: true, phone: true },
    }),
  ]);

  const list: SmsRecipient[] = [];
  if (tenant?.phone) list.push({ name: tenant.name, phone: tenant.phone });
  for (const admin of admins) list.push({ userId: admin.id, name: admin.name, phone: admin.phone });
  return list;
}

/** Solde d'un pèlerin (dernière réservation moins paiements COMPLETED). */
export async function getPilgrimBalance(tenantId: string, pilgrimId: string) {
  const db = prisma as Db;

  const pilgrim = await prisma.user.findFirst({
    where: { id: pilgrimId, tenantId, role: "PILGRIM" },
    select: {
      name: true,
      phone: true,
      reservations: {
        select: { totalAmount: true, offer: { select: { priceAdult: true, currency: true } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!pilgrim) return null;

  const reservation = pilgrim.reservations[0];
  const total = reservation?.totalAmount ?? reservation?.offer?.priceAdult ?? 0;
  const currency = reservation?.offer?.currency ?? "FCFA";

  const payments = await db.payment.findMany({
    where: { pilgrimId, tenantId, status: "COMPLETED" },
    select: { amount: true, type: true },
  });
  const paid = payments.reduce(
    (sum: number, p: { amount: number; type: string }) =>
      p.type === "REFUND" ? sum - p.amount : sum + p.amount,
    0
  );

  return {
    name: pilgrim.name,
    phone: pilgrim.phone,
    total,
    paid,
    balance: Math.max(total - paid, 0),
    currency,
  };
}

// Compteurs (calculés par agrégation : aucune valeur à resynchroniser)
async function countFor(db: Db, where: Record<string, unknown>) {
  const [sent, failed, skipped, segments, last] = await Promise.all([
    db.smsMessage.count({ where: { ...where, status: "SENT" } }),
    db.smsMessage.count({ where: { ...where, status: "FAILED" } }),
    db.smsMessage.count({ where: { ...where, status: "SKIPPED" } }),
    db.smsMessage.aggregate({ where: { ...where, status: "SENT" }, _sum: { segments: true } }),
    db.smsMessage.findFirst({
      where: { ...where, status: "SENT" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  return {
    sent,
    failed,
    skipped,
    segments: segments._sum.segments ?? 0,
    lastSentAt: last ? new Date(last.createdAt).toISOString() : null,
  } satisfies SmsCounters;
}

/** Compteurs d'un tenant sur une période + cumul total. */
export async function getSmsCounters(
  tenantId: string,
  range: SmsRange
): Promise<{ scope: SmsCounters; all: SmsCounters; month: SmsCounters }> {
  const db = prisma as Db;
  const start = rangeStart(range);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [scope, all, month] = await Promise.all([
    countFor(db, start ? { tenantId, createdAt: { gte: start } } : { tenantId }),
    countFor(db, { tenantId }),
    countFor(db, { tenantId, createdAt: { gte: monthStart } }),
  ]);

  return { scope, all, month };
}

/** Compteurs d'un pèlerin (bloc « historique » de sa fiche). */
export async function getPilgrimSmsCounters(tenantId: string, pilgrimId: string) {
  const db = prisma as Db;
  return countFor(db, { tenantId, recipientId: pilgrimId, status: "SENT" });
}

// Stats plateforme (page superadmin)

export type TenantSmsStat = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: string;
  sent: number;
  failed: number;
  skipped: number;
  segments: number;
  bySource: Record<string, number>;
  lastSentAt: string | null;
};

export type SmsPlatformStats = {
  totals: SmsCounters & { tenants: number; accounts: number; payments: number; manual: number };
  today: SmsCounters;
  byTenant: TenantSmsStat[];
};

/**
 * Agrégation de TOUS les SMS, groupés par agence (source unique de vérité pour
 * la page superadmin : les chiffres sont recalculés à chaque appel).
 */
export async function getSmsStatsByTenant(
  range: SmsRange,
  search?: string
): Promise<SmsPlatformStats> {
  const db = prisma as Db;
  const start = rangeStart(range);
  const todayStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );

  const tenants = await prisma.tenant.findMany({
    where: search
      ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] }
      : {},
    select: { id: true, name: true, slug: true, status: true },
    orderBy: { name: "asc" },
  });
  const tenantIds = tenants.map((t) => t.id);

  const base = {
    tenantId: { in: tenantIds },
    ...(start ? { createdAt: { gte: start } } : {}),
  };

  const [grouped, todayTotals, sourceGroups] = await Promise.all([
    db.smsMessage.groupBy({
      by: ["tenantId", "status"],
      where: base,
      _count: { _all: true },
      _sum: { segments: true },
    }),
    countFor(db, { tenantId: { in: tenantIds }, createdAt: { gte: todayStart } }),
    db.smsMessage.groupBy({
      by: ["tenantId", "source"],
      where: { ...base, status: "SENT" },
      _count: { _all: true },
    }),
  ]);

  const lastByTenant: { tenantId: string; createdAt: Date }[] = await db.smsMessage.groupBy({
    by: ["tenantId"],
    where: { ...base, status: "SENT" },
    _max: { createdAt: true },
  });

  const rows = new Map<string, TenantSmsStat>();
  for (const tenant of tenants) {
    rows.set(tenant.id, {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      tenantStatus: tenant.status,
      sent: 0,
      failed: 0,
      skipped: 0,
      segments: 0,
      bySource: {},
      lastSentAt: null,
    });
  }

  for (const group of grouped) {
    const row = rows.get(group.tenantId);
    if (!row) continue;
    const count = group._count?._all ?? 0;
    if (group.status === "SENT") {
      row.sent = count;
      row.segments = group._sum?.segments ?? 0;
    } else if (group.status === "FAILED") row.failed = count;
    else if (group.status === "SKIPPED") row.skipped = count;
  }

  for (const group of sourceGroups) {
    const row = rows.get(group.tenantId);
    if (!row) continue;
    row.bySource[group.source] = group._count?._all ?? 0;
  }

  for (const item of lastByTenant) {
    const row = rows.get(item.tenantId);
    if (!row) continue;
    const max = (item as unknown as { _max?: { createdAt?: Date } })._max;
    row.lastSentAt = max?.createdAt ? new Date(max.createdAt).toISOString() : null;
  }

  const byTenant = [...rows.values()];
  const sum = (pick: (row: TenantSmsStat) => number) =>
    byTenant.reduce((acc, row) => acc + pick(row), 0);

  return {
    totals: {
      sent: sum((r) => r.sent),
      failed: sum((r) => r.failed),
      skipped: sum((r) => r.skipped),
      segments: sum((r) => r.segments),
      lastSentAt:
        byTenant
          .map((r) => r.lastSentAt)
          .filter((value): value is string => !!value)
          .sort()
          .pop() ?? null,
      tenants: byTenant.filter((r) => r.sent > 0).length,
      accounts: sum((r) => r.bySource.ACCOUNT ?? 0),
      payments: sum((r) => r.bySource.PAYMENT ?? 0),
      manual: sum((r) => r.bySource.MANUAL ?? 0),
    },
    today: todayTotals,
    byTenant: byTenant.sort((a, b) => b.sent - a.sent),
  };
}

// Automatismes (planifiés via after() : jamais bloquants)

/**
 * Automatisme 1 — création d'un compte pèlerin : 2 SMS.
 *  1. au pèlerin (bienvenue + invitation à compléter son dossier)
 *  2. à l'agence (nouveau pèlerin, avec son numéro et l'origine)
 * `source` indique qui a créé le compte : "ADMIN" (espace agence) ou "PORTAL".
 */
export function notifyAccountCreated(opts: {
  tenantId: string;
  pilgrim: { id: string; name: string; phone?: string | null };
  source: "ADMIN" | "PORTAL";
  actor?: { id: string; name: string } | null;
}) {
  after(async () => {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: opts.tenantId },
        select: { name: true },
      });
      const agency = tenant?.name ?? "Votre agence";

      // 1. SMS au pèlerin
      await deliverSms({
        tenantId: opts.tenantId,
        recipient: { userId: opts.pilgrim.id, name: opts.pilgrim.name, phone: opts.pilgrim.phone },
        body:
          `${agency} : bienvenue ${opts.pilgrim.name} ! Votre compte pèlerin est créé. ` +
          "Complétez votre dossier pour finaliser votre inscription.",
        source: "ACCOUNT",
      });

      // 2. SMS à l'agence
      const recipients = await resolveAgencyRecipients(opts.tenantId);
      const origin =
        opts.source === "PORTAL"
          ? "via le portail public"
          : `par ${opts.actor?.name || "l'agence"}`;
      const body =
        `Nouveau pèlerin : ${opts.pilgrim.name}` +
        `${opts.pilgrim.phone ? ` (${opts.pilgrim.phone})` : ""} - inscrit ${origin}.`;

      await sendBulkSms({
        tenantId: opts.tenantId,
        recipients,
        body,
        source: "ACCOUNT",
      });
    } catch {
      // Un SMS raté ne doit jamais faire échouer la création du compte
    }
  });
}

/**
 * Automatisme 2 — versement enregistré : 2 SMS.
 *  1. au pèlerin (montant reçu + solde restant)
 *  2. à l'agence (confirmation du versement)
 */
export function notifyPaymentReceived(opts: {
  tenantId: string;
  pilgrim: { id: string; name: string; phone?: string | null };
  amount: number;
  isRefund?: boolean;
  actor?: { id: string; name: string } | null;
}) {
  after(async () => {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: opts.tenantId },
        select: { name: true },
      });
      const agency = tenant?.name ?? "Votre agence";

      const balance = await getPilgrimBalance(opts.tenantId, opts.pilgrim.id);
      const currency = balance?.currency ?? "FCFA";
      const amountLabel = formatAmount(opts.amount, currency);
      const balanceLabel = balance ? formatAmount(balance.balance, currency) : null;
      // Textes sans accents composés : restent en GSM-7 (1 seul SMS facturé)
      const isRefund = opts.isRefund === true;
      const label = isRefund ? "remboursement" : "versement";

      // 1. SMS au pèlerin
      await deliverSms({
        tenantId: opts.tenantId,
        recipient: { userId: opts.pilgrim.id, name: opts.pilgrim.name, phone: opts.pilgrim.phone },
        body:
          `${agency} : ${label} de ${amountLabel} enregistre` +
          (balanceLabel ? `. Solde restant : ${balanceLabel}.` : "."),
        source: "PAYMENT",
      });

      // 2. SMS à l'agence
      const recipients = await resolveAgencyRecipients(opts.tenantId);
      const body =
        `${isRefund ? "Remboursement" : "Versement"} de ${opts.pilgrim.name} : ${amountLabel}` +
        (balanceLabel ? ` - solde ${balanceLabel}` : "") +
        (opts.actor?.name ? ` (saisi par ${opts.actor.name})` : "");

      await sendBulkSms({
        tenantId: opts.tenantId,
        recipients,
        body,
        source: "PAYMENT",
      });
    } catch {
      // Un SMS raté ne doit jamais faire échouer l'enregistrement du versement
    }
  });
}