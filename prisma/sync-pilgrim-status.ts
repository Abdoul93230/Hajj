/**
 * sync-pilgrim-status.ts
 * Recalcule et met à jour le pilgrimStatus de TOUS les pèlerins en DB
 * en fonction de leurs paiements réels.
 *
 * Lancer avec :
 *   npx tsx --env-file=.env prisma/sync-pilgrim-status.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

function computeStatus(paid: number, total: number, current: string): string {
  if (current === "CANCELLED") return "CANCELLED";
  if (total <= 0 || paid <= 0) return "PENDING";
  const pct = paid / total;
  if (pct < 0.5)  return "INCOMPLETE";
  if (pct < 1.0)  return "REGISTERED";
  return "VISA_OK";
}

async function main() {
  const pilgrims = await prisma.user.findMany({
    where: { role: "PILGRIM" },
    select: {
      id: true,
      name: true,
      pilgrimStatus: true,
      reservations: {
        select: {
          totalAmount: true,
          offer: { select: { priceAdult: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let updated = 0;
  for (const p of pilgrims) {
    const total = p.reservations[0]?.totalAmount ?? p.reservations[0]?.offer?.priceAdult ?? 0;

    const payments = await db.payment.findMany({
      where: { pilgrimId: p.id, status: "COMPLETED" },
      select: { amount: true, type: true },
    });
    const paid: number = payments.reduce(
      (s: number, x: { amount: number; type: string }) =>
        x.type === "REFUND" ? s - x.amount : s + x.amount,
      0,
    );

    const newStatus = computeStatus(paid, total, p.pilgrimStatus);
    if (newStatus !== p.pilgrimStatus) {
      await prisma.user.update({ where: { id: p.id }, data: { pilgrimStatus: newStatus } });
      console.log(`  ${p.name}: ${p.pilgrimStatus} → ${newStatus}  (versé ${paid}/${total})`);
      updated++;
    }
  }

  console.log(`\nTerminé. ${updated} pèlerin(s) mis à jour sur ${pilgrims.length}.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
