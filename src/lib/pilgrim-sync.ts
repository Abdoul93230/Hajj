import "server-only";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// Synchronisation des compteurs/flags du pèlerin après toute opération sur ses
// documents (envoi, modification, suppression, validation).
// Appelée par les routes /api/agency-admin/documents/* et /api/pilgrim/documents/*.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recalcule et applique sur `User` :
 *   · `hasPassport` / `hasCni` — d'après les documents reçus ou validés ;
 *   · `photoUrl` — reflète le document « Photo d'identité » (PHOTO) le plus
 *     récent non rejeté et non PDF. C'est le même champ partout : la modale
 *     d'édition pèlerin et la page Documents créent tous deux ce document.
 */
export async function syncPilgrimFlags(
  tenantId: string,
  userId: string,
  removedFileUrl?: string | null
) {
  const docs = await prisma.pilgrimDocument.findMany({
    where: { tenantId, userId, status: { in: ["RECEIVED", "VALID"] } },
    select: { type: true, fileUrl: true },
    orderBy: { createdAt: "desc" },
  });

  const types = new Set(docs.map((d) => d.type));
  const photoDoc = docs.find(
    (d) => d.type === "PHOTO" && d.fileUrl && !d.fileUrl.toLowerCase().endsWith(".pdf")
  );

  // photoUrl : SUIVI du document « Photo d'identité » (PHOTO). C'est le même
  // champ partout — la modale d'édition pèlerin et la page Documents créent
  // tous deux ce document. Quand il existe, photoUrl le reflète ; quand il
  // disparaît, on n'efface photoUrl que si elle pointait vers lui (au cas où
  // elle aurait été définie autrement, ex. import de données).
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { photoUrl: true },
  });

  let photoUrl: string | null | undefined = undefined;
  if (photoDoc?.fileUrl) {
    photoUrl = photoDoc.fileUrl;
  } else if (removedFileUrl && current?.photoUrl === removedFileUrl) {
    photoUrl = null;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      hasPassport: types.has("PASSPORT"),
      hasCni: types.has("CNI"),
      ...(photoUrl !== undefined ? { photoUrl } : {}),
    },
  });
}