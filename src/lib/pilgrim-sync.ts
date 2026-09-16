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
 *   · `photoUrl` — reprend le document « Photo d'identité » (PHOTO) le plus
 *     récent non rejeté et non PDF. Tant qu'un tel document existe, il a la
 *     priorité sur une photo posée directement (route pilgrims/photo) ; quand
 *     il disparaît, on n'efface `photoUrl` que si elle pointait vers le
 *     document supprimé (paramètre `removedFileUrl`).
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

  // photoUrl : même priorité que le portail public —
  //   1) photo posée directement par l'agence (route pilgrims/photo) ;
  //   2) sinon, le document « Photo d'identité » le plus récent.
  // On ne remplisse donc que si `photoUrl` est vide ; et on l'efface seulement
  // si elle pointait vers le document qu'on vient de supprimer.
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { photoUrl: true },
  });

  let photoUrl: string | null | undefined = undefined;
  if (!current?.photoUrl && photoDoc?.fileUrl) {
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