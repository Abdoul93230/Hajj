/**
 * Resynchronise `user.photoUrl` avec le document « Photo d'identité » (PHOTO).
 *
 * C'est pourquoi la photo ne s'affichait pas dans l'espace agence (avatar,
 * documents, badge) alors que le document était bien présent : `photoUrl`
 * n'avait pas été alimenté (et sur MongoDB, un champ optionnel ABSENT est lu
 * comme `null` mais n'est PAS trouvé par le filtre `photoUrl: null`).
 *
 * Règle : le document « Photo d'identité » (PHOTO) fait foi — `user.photoUrl`
 * reflète son `fileUrl`. La modale d'édition pèlerin (`documents/upload`
 * type=PHOTO) et la page Documents créent le même document ; il n'existe donc
 * plus de photo « posée à part ».
 *
 * Idempotent : un second passage ne réécrit rien.
 *
 * Lancer : npm run fix:photos
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // On part des pèlerins ayant un document « Photo d'identité » actif
  // (non rejeté, non PDF) : ce sont les seuls dont `photoUrl` doit refléter
  // le document. ⚠️ MongoDB : un champ optionnel ABSENT est lu comme `null`
  // mais n'est PAS trouvé par `photoUrl: null` — on ne filtre donc jamais
  // sur `photoUrl`, on le COMPARE.
  const users = await prisma.user.findMany({
    where: {
      role: "PILGRIM",
      documents: {
        some: {
          type: "PHOTO",
          status: { not: "REJECTED" },
          fileUrl: { not: { endsWith: ".pdf" } },
        },
      },
    },
    select: { id: true, name: true, email: true, photoUrl: true },
  });

  console.log(`Pèlerins avec un document « Photo d'identité » : ${users.length}`);

  let fixed = 0;
  for (const user of users) {
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
    // Déjà synchronisé (ou aucun document exploitable) → rien à faire
    if (!photoDoc?.fileUrl || photoDoc.fileUrl === user.photoUrl) continue;

    await prisma.user.update({
      where: { id: user.id },
      data: { photoUrl: photoDoc.fileUrl },
    });
    fixed++;
    console.log(`FIX  ${user.name.padEnd(26)} ${user.email} → ${photoDoc.fileUrl}`);
  }

  console.log(`\n${fixed} photo(s) de profil synchronisée(s).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});