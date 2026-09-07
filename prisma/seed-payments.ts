/**
 * seed-payments.ts
 * Génère des paiements réalistes pour tous les pèlerins existants en base.
 * Idempotent : si un pèlerin a déjà des paiements, il est ignoré.
 *
 * Lancer avec :
 *   npx tsx --env-file=.env prisma/seed-payments.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Arrondit au millier le plus proche (ex: FCFA). */
function round1k(n: number): number {
  return Math.max(1000, Math.round(n / 1000) * 1000);
}

/** Génère une référence de reçu réaliste. */
function makeRef(prefix: string, date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const n = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${y}${m}-${n}`;
}

/** Méthode de paiement pondérée (contexte Niger). */
function pickMethod(): string {
  const r = Math.random();
  if (r < 0.58) return "CASH";
  if (r < 0.83) return "MOBILE_MONEY";
  if (r < 0.95) return "BANK_TRANSFER";
  return "CHECK";
}

// ─── Logique de génération par statut ────────────────────────────────────────

interface PaymentDraft {
  amount:    number;
  type:      string;
  method:    string;
  status:    string;
  reference: string;
  paidAt:    Date;
}

function generateDrafts(
  total:           number,
  pilgrimStatus:   string,
  reservationStatus: string,
  baseDate:        Date,   // date de création de la réservation
): PaymentDraft[] {
  const drafts: PaymentDraft[] = [];

  const jitter = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  // ── PENDING : pas encore engagé, peut-être un petit acompte ──────────────
  if (pilgrimStatus === "PENDING") {
    // 55% chance d'un acompte modeste
    if (Math.random() < 0.55) {
      const d = addDays(baseDate, jitter(2, 15));
      drafts.push({
        amount:    round1k(total * (0.2 + Math.random() * 0.1)),
        type:      "DEPOSIT",
        method:    pickMethod(),
        status:    "COMPLETED",
        reference: makeRef("REC", d),
        paidAt:    d,
      });
    }
    // 30% chance d'avoir un versement prévu mais pas encore encaissé
    if (Math.random() < 0.30) {
      const d = addDays(baseDate, jitter(30, 60));
      drafts.push({
        amount:    round1k(total * 0.2),
        type:      "INSTALLMENT",
        method:    "CASH",
        status:    "PENDING",
        reference: makeRef("PREV", d),
        paidAt:    d,
      });
    }
    return drafts;
  }

  // ── INCOMPLETE : dossier entamé, paiement partiel ────────────────────────
  if (pilgrimStatus === "INCOMPLETE") {
    const d1 = addDays(baseDate, jitter(3, 12));
    drafts.push({
      amount:    round1k(total * (0.25 + Math.random() * 0.1)),
      type:      "DEPOSIT",
      method:    pickMethod(),
      status:    "COMPLETED",
      reference: makeRef("REC", d1),
      paidAt:    d1,
    });
    // 65% chance d'un 2e versement partiel
    if (Math.random() < 0.65) {
      const d2 = addDays(d1, jitter(15, 35));
      drafts.push({
        amount:    round1k(total * (0.15 + Math.random() * 0.1)),
        type:      "INSTALLMENT",
        method:    pickMethod(),
        status:    "COMPLETED",
        reference: makeRef("REC", d2),
        paidAt:    d2,
      });
    }
    return drafts;
  }

  // ── REGISTERED : 50–70 % payé, 2–3 tranches, parfois une tranche prévue ──
  if (pilgrimStatus === "REGISTERED") {
    const d1 = addDays(baseDate, jitter(3, 10));
    const pct1 = 0.30 + Math.random() * 0.07;
    drafts.push({
      amount:    round1k(total * pct1),
      type:      "DEPOSIT",
      method:    pickMethod(),
      status:    "COMPLETED",
      reference: makeRef("REC", d1),
      paidAt:    d1,
    });

    const d2 = addDays(d1, jitter(20, 35));
    drafts.push({
      amount:    round1k(total * (0.20 + Math.random() * 0.08)),
      type:      "INSTALLMENT",
      method:    pickMethod(),
      status:    "COMPLETED",
      reference: makeRef("REC", d2),
      paidAt:    d2,
    });

    if (Math.random() < 0.60) {
      const d3 = addDays(d2, jitter(20, 35));
      drafts.push({
        amount:    round1k(total * 0.15),
        type:      "INSTALLMENT",
        method:    pickMethod(),
        status:    "COMPLETED",
        reference: makeRef("REC", d3),
        paidAt:    d3,
      });
    }

    // Tranche future prévue (PENDING)
    if (Math.random() < 0.55) {
      const lastPaid = drafts[drafts.length - 1].paidAt;
      const dP = addDays(lastPaid, jitter(30, 60));
      drafts.push({
        amount:    round1k(total * 0.15),
        type:      "INSTALLMENT",
        method:    "CASH",
        status:    "PENDING",
        reference: makeRef("PREV", dP),
        paidAt:    dP,
      });
    }
    return drafts;
  }

  // ── VISA_OK : quasi ou totalement soldé (3–4 paiements) ─────────────────
  if (pilgrimStatus === "VISA_OK") {
    const d1 = addDays(baseDate, jitter(2, 7));
    const pct1 = 0.35 + Math.random() * 0.05;
    drafts.push({
      amount:    round1k(total * pct1),
      type:      "DEPOSIT",
      method:    pickMethod(),
      status:    "COMPLETED",
      reference: makeRef("REC", d1),
      paidAt:    d1,
    });

    const d2 = addDays(d1, jitter(18, 30));
    drafts.push({
      amount:    round1k(total * 0.25),
      type:      "INSTALLMENT",
      method:    pickMethod(),
      status:    "COMPLETED",
      reference: makeRef("REC", d2),
      paidAt:    d2,
    });

    const d3 = addDays(d2, jitter(18, 28));
    drafts.push({
      amount:    round1k(total * 0.20),
      type:      "INSTALLMENT",
      method:    pickMethod(),
      status:    "COMPLETED",
      reference: makeRef("REC", d3),
      paidAt:    d3,
    });

    // Calculer le reste et créer le solde final
    const paid = drafts.reduce((s, p) => s + (p.status === "COMPLETED" ? p.amount : 0), 0);
    const remaining = Math.max(0, total - paid);
    if (remaining > 0) {
      const d4 = addDays(d3, jitter(15, 25));
      // 80% soldé, 20% encore en attente
      const finalStatus = Math.random() < 0.80 ? "COMPLETED" : "PENDING";
      drafts.push({
        amount:    round1k(remaining),
        type:      "FINAL",
        method:    pickMethod(),
        status:    finalStatus,
        reference: makeRef(finalStatus === "COMPLETED" ? "REC" : "PREV", d4),
        paidAt:    d4,
      });
    }
    return drafts;
  }

  return drafts;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Démarrage seed-payments...\n");

  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true } });
  console.log(`Tenants trouvés : ${tenants.length}\n`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const tenant of tenants) {
    console.log(`━━━ Tenant : ${tenant.slug} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const pilgrims = await prisma.user.findMany({
      where:   { tenantId: tenant.id, role: "PILGRIM" },
      include: {
        reservations: {
          include: { offer: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`  Pèlerins : ${pilgrims.length}`);

    for (const pilgrim of pilgrims) {
      // Idempotence : déjà des paiements ?
      const existingCount: number = await db.payment.count({ where: { pilgrimId: pilgrim.id } });
      if (existingCount > 0) {
        console.log(`  ↷ ${pilgrim.name.padEnd(30)} déjà ${existingCount} paiement(s) — ignoré`);
        totalSkipped++;
        continue;
      }

      const reservation = pilgrim.reservations[0];
      if (!reservation) {
        console.log(`  ↷ ${pilgrim.name.padEnd(30)} aucune réservation — ignoré`);
        totalSkipped++;
        continue;
      }

      const totalAmount = reservation.totalAmount ?? reservation.offer.priceAdult;
      const drafts = generateDrafts(
        totalAmount,
        pilgrim.pilgrimStatus,
        reservation.status,
        reservation.createdAt,
      );

      // Pour une réservation CANCELLED : ajouter un remboursement sur les paiements complétés
      if (reservation.status === "CANCELLED") {
        const completedDrafts = drafts.filter(d => d.status === "COMPLETED" && d.type !== "REFUND");
        if (completedDrafts.length > 0) {
          const totalPaid = completedDrafts.reduce((s, d) => s + d.amount, 0);
          // Remboursement partiel ou total (70–100 %)
          const refundPct = 0.70 + Math.random() * 0.30;
          const refundAmt = round1k(totalPaid * refundPct);
          const lastDate  = completedDrafts[completedDrafts.length - 1].paidAt;
          const refundDate = addDays(lastDate, Math.floor(Math.random() * 20) + 7);
          drafts.push({
            amount:    refundAmt,
            type:      "REFUND",
            method:    pickMethod(),
            status:    "COMPLETED",
            reference: makeRef("REMB", refundDate),
            paidAt:    refundDate,
          });
        }
      }

      if (drafts.length === 0) {
        console.log(`  ↷ ${pilgrim.name.padEnd(30)} (${pilgrim.pilgrimStatus}) — aucun paiement généré`);
        totalSkipped++;
        continue;
      }

      // Créer les paiements en base
      for (const draft of drafts) {
        await db.payment.create({
          data: {
            tenantId:      tenant.id,
            reservationId: reservation.id,
            pilgrimId:     pilgrim.id,
            amount:        draft.amount,
            type:          draft.type,
            method:        draft.method,
            status:        draft.status,
            reference:     draft.reference,
            notes:         null,
            paidAt:        draft.paidAt,
            createdBy:     null,
          },
        });
      }

      const paidTotal  = drafts.filter(d => d.status === "COMPLETED" && d.type !== "REFUND").reduce((s, d) => s + d.amount, 0);
      const refundTotal = drafts.filter(d => d.type === "REFUND").reduce((s, d) => s + d.amount, 0);
      const currency   = reservation.offer.currency;
      const summary    = refundTotal > 0
        ? `${new Intl.NumberFormat("fr-FR").format(paidTotal)} ${currency} encaissé, −${new Intl.NumberFormat("fr-FR").format(refundTotal)} remboursé`
        : `${new Intl.NumberFormat("fr-FR").format(paidTotal)} ${currency}`;

      console.log(`  ✓ ${pilgrim.name.padEnd(30)} [${pilgrim.pilgrimStatus.padEnd(10)}] ${drafts.length} pmt  |  ${summary}`);
      totalCreated += drafts.length;
    }

    console.log();
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`✅  Terminé — ${totalCreated} paiements créés, ${totalSkipped} pèlerins ignorés`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
