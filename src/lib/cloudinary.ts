import "server-only";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadDocumentBuffer(
  buffer: Buffer,
  options: { folder: string; publicId: string; resourceType?: "image" | "raw" | "auto" }
) {
  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: options.folder,
          public_id: options.publicId,
          resource_type: options.resourceType ?? "auto",
          overwrite: true,
        },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error("Upload failed"));
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        }
      )
      .end(buffer);
  });
}

/**
 * Identifiant public Cloudinary d'un document pèlerin.
 *
 * ⚠️ Pour `resource_type: "raw"` (les PDF), l'extension fait PARTIE du
 * public_id. Sans elle, l'URL de livraison se termine par « visa-<userId> » :
 * le navigateur enregistre alors un fichier sans extension et il est impossible
 * de l'ouvrir. On inclut donc l'extension pour les ressources « raw ».
 */
export function buildDocumentPublicId(
  type: string,
  ownerId: string,
  ext: string,
  resourceType: "image" | "raw"
): string {
  const base = `${type.toLowerCase()}-${ownerId}`;
  return resourceType === "raw" ? `${base}.${ext}` : base;
}

/**
 * Extrait le public_id d'une URL Cloudinary, avec ou sans extension.
 * Ex : …/raw/upload/v123/hajj-platform/x/visa-abc.pdf → hajj-platform/x/visa-abc.pdf
 */
export function extractCloudinaryPublicId(url: string): string | null {
  try {
    const match = url.split("?")[0].match(/\/upload\/(?:v\d+\/)?(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export async function deleteCloudinaryFile(publicId: string) {
  // Pour un fichier « raw », le public_id contient l'extension : on tente les
  // deux variantes (avec et sans extension) pour couvrir aussi les fichiers
  // historiques enregistrés sans extension.
  const withoutExt = publicId.replace(/\.[a-z0-9]{2,5}$/i, "");
  const ids = withoutExt === publicId ? [publicId] : [publicId, withoutExt];

  for (const id of ids) {
    try {
      await cloudinary.uploader.destroy(id, { resource_type: "image", invalidate: true });
      await cloudinary.uploader.destroy(id, { resource_type: "raw", invalidate: true });
    } catch {
      // Ignorer si déjà supprimé
    }
  }
}

export default cloudinary;
