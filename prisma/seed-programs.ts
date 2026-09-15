/**
 * seed-programs.ts
 * Alimente le programme détaillé (champ JSON `Offer.data` : vols, hôtels,
 * programme jour par jour, inclus / non inclus, documents, points forts) de
 * chaque offre ACTIVE à partir du modèle standard Hajj / Oumra.
 *
 * Règles :
 *   · le contenu déjà saisi par l'agence est conservé (nettoyé) ;
 *   · les blocs absents ou vides sont complétés par le modèle standard ;
 *   · les valeurs corrompues (caractères de contrôle / séquences d'échappement)
 *     sont supprimées.
 * Idempotent : un second passage ne réécrit rien.
 *
 * Lancer avec :
 *   npx tsx --env-file=.env prisma/seed-programs.ts
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { normalizeProgram, standardTemplate } from "../src/lib/offer-program";

const prisma = new PrismaClient();

/** Valeur manifestement corrompue : trop courte, échappement ou caractère de contrôle. */
const isBad = (s: string) => s.length < 3 || /\\[a-z0-9]|[\u0000-\u001f]/.test(s);

const BLOCS = [
  "highlights",
  "flights",
  "hotels",
  "program",
  "included",
  "notIncluded",
  "documents",
] as const;

async function main() {
  const offers = await prisma.offer.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  for (const offer of offers) {
    const existing = normalizeProgram(offer.data);
    const tpl = standardTemplate(offer.type);
    const merged: Record<string, unknown> = {};

    for (const bloc of BLOCS) {
      const own = existing[bloc] as unknown[] | undefined;
      let value = tpl[bloc] as unknown[] | undefined;

      if (own?.length) {
        const cleaned = own.filter((x) => typeof x !== "string" || !isBad(x));
        if (cleaned.length) value = cleaned; // contenu de l'agence prioritaire
      }
      if (value?.length) merged[bloc] = value;
    }
    if (existing.maxCapacity) merged.maxCapacity = existing.maxCapacity;

    const identical =
      BLOCS.every(
        (b) => JSON.stringify(existing[b] ?? []) === JSON.stringify(merged[b] ?? [])
      ) && existing.maxCapacity === merged.maxCapacity;

    if (!identical) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: { data: merged as unknown as Prisma.InputJsonValue },
      });
    }

    const n = (b: string) => ((merged[b] as unknown[]) ?? []).length;
    console.log(
      `${identical ? "skip" : "SEED"} ${offer.type.padEnd(6)} ${offer.titleFr.padEnd(28)} ` +
        `vols=${n("flights")} hôtels=${n("hotels")} jours=${n("program")} ` +
        `inclus=${n("included")} nonInclus=${n("notIncluded")} ` +
        `documents=${n("documents")} pointsForts=${n("highlights")}`
    );
  }

  await prisma.$disconnect();
}

main();