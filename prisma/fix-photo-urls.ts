/**
 * Rattrape les pèlerins qui ont un document « Photo d'identité » (PHOTO,
 * non rejeté, non PDF) mais dont `user.photoUrl` est vide — c'est pourquoi
 * leur photo ne s'affichait pas dans l'espace agence (avatar, documents,
 * badge) alors que le document est bien présent.
 *
 * Règle (identique au portail public) : `photoUrl` reste prioritaire s'il est
 * déjà défini ; on ne le remplit que s'il est vide.
 *
 * Idempotent : un second passage ne réécrit rien.
 *
 * Lancer : npm run fix:photos
 */
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ⚠️ MongoDB : un champ optionnel ABSENT du document est lu comme `null`
  // mais n'est PAS trouvé par le filtre `photoUrl: null`. Il faut `isSet: false`
  // pour couvrir les deux cas (champ absent OU explicitement null).
  const users = await prisma.user.findMany({
    where: {
      role: "PILGRIM",
      OR: [{ photoUrl: { isSet: false } }, { photoUrl: { equals: null } }],
    },
    select: { id: true, name: true, email: true, photoUrl: true },
  });

  console.log(`Pèlerins sans photo de profil : ${users.length}`);

  let fixed = 0;
  for (const user of users) {
    console.log(`  check ${user.name} (${user.email})`);
    const photoDoc = await prisma.pilgrimDocument.findFirst({
      where: {
        userId: user.id,
        type: "PHOTO",
        status: { not: "REJECTED" },
        fileUrl: { not: { endsWith: ".pdf" } },
      },
      orderBy: { createdAt: "desc" },
      select: { fileUrl: true },
    });
    console.log(`    photoDoc = ${photoDoc?.fileUrl ?? "(aucun)"}`);
    if (!photoDoc?.fileUrl) continue;

    await prisma.user.update({
      where: { id: user.id },
      data: { photoUrl: photoDoc.fileUrl },
    });
    fixed++;
    console.log(`FIX  ${user.name.padEnd(26)} ${user.email} → ${photoDoc.fileUrl}`);
  }

  console.log(`\n${fixed} photo(s) de profil rattrapée(s).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});