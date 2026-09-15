/**
 * Répare les documents uploadés AVANT le correctif d'extension Cloudinary.
 *
 * Problème : pour un PDF (`resource_type: "raw"`), Cloudinary intègre
 * l'extension au public_id. Les anciens enregistrements avaient un public_id
 * sans extension, donc une URL se terminant par « visa-<userId> » : le fichier
 * téléchargé n'avait plus d'extension... et ne pouvait pas être ouvert.
 *
 * Ce script re-télécharge chaque fichier concerné, le re-uploade avec la bonne
 * extension, met à jour la base puis supprime l'ancien fichier.
 * Idempotent : les documents déjà corrects sont ignorés.
 *
 * Lancer : npm run fix:documents
 */
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "@prisma/client";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const prisma = new PrismaClient();

/** public_id contenu dans une URL Cloudinary (avec ou sans extension). */
function publicIdFromUrl(url: string): string | null {
  const m = url.split("?")[0].match(/\/upload\/(?:v\d+\/)?(.+)$/);
  return m ? m[1] : null;
}

/** Vrai si la fin de l'URL porte une extension de fichier. */
function hasExtension(url: string): boolean {
  return /\.[a-z0-9]{2,5}$/i.test(url.split("?")[0]);
}

async function uploadRaw(buffer: Buffer, publicId: string) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { public_id: publicId, resource_type: "raw", overwrite: true },
        (err, result) =>
          err || !result ? reject(err ?? new Error("upload")) : resolve(result)
      )
      .end(buffer);
  });
}

async function main() {
  const docs = await prisma.pilgrimDocument.findMany({
    where: { fileUrl: { contains: "/raw/" } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Documents « raw » à vérifier : ${docs.length}`);

  for (const doc of docs) {
    if (!doc.fileUrl) continue;

    if (hasExtension(doc.fileUrl)) {
      console.log(`ok    ${doc.type.padEnd(9)} déjà corrigé`);
      continue;
    }

    const oldPublicId = publicIdFromUrl(doc.fileUrl);
    if (!oldPublicId) {
      console.log(`skip  ${doc.type.padEnd(9)} URL illisible : ${doc.fileUrl}`);
      continue;
    }

    // Ancien fichier orphelin (uploadé sans extension) : on le supprime même si
    // le téléchargement échoue, afin de ne pas laisser de doublon accessible.
    const cleanupOld = () =>
      cloudinary.uploader
        .destroy(oldPublicId, { resource_type: "raw", invalidate: true })
        .catch(() => {});

    const res = await fetch(doc.fileUrl);
    if (!res.ok) {
      console.log(`skip  ${doc.type.padEnd(9)} téléchargement KO (HTTP ${res.status})`);
      continue;
    }
    const buffer = Buffer.from(await res.arrayBuffer());

    // Extension déduite du contenu (signature %PDF-) puis du Content-Type
    const isPdf = buffer.subarray(0, 5).toString("latin1") === "%PDF-";
    const ctype = res.headers.get("content-type")?.split(";")[0] ?? "";
    const ext = isPdf ? "pdf" : ctype.split("/")[1] || "bin";

    const uploaded = await uploadRaw(buffer, `${oldPublicId}.${ext}`);
    await prisma.pilgrimDocument.update({
      where: { id: doc.id },
      data: { fileUrl: uploaded.secure_url },
    });
    await cleanupOld();

    console.log(`FIX   ${doc.type.padEnd(9)} → ${uploaded.secure_url}`);
  }

  await prisma.$disconnect();
}

main();