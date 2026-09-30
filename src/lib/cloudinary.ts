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

/**
 * Tous les public_id Cloudinary présents dans une valeur JSON quelconque.
 *
 * Sert à purger un thème d'agence SANS dépendre d'une liste de clés à
 * maintenir : toute chaîne contenant « res.cloudinary.com » est collectée, à
 * n'importe quelle profondeur (images de marque, galeries, partenaires…).
 */
export function collectCloudinaryPublicIds(value: unknown): string[] {
  const found = new Set<string>();

  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      if (node.includes("res.cloudinary.com")) {
        const pid = extractCloudinaryPublicId(node);
        if (pid) found.add(pid);
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (node && typeof node === "object") {
      for (const item of Object.values(node as Record<string, unknown>)) walk(item);
    }
  };

  walk(value);
  return [...found];
}

/**
 * Purge TOUT ce qu'une agence a téléversé sur Cloudinary.
 *
 * Les 3 dossiers d'upload vivent sous `hajj-platform/<tenantId>/` :
 *   • documents/<userId>…   → pièces des pèlerins (images et PDF « raw »)
 *   • payment-receipts      → justificatifs de paiement
 *   • branding              → logo, hero, bannières, galeries
 *
 * On supprime donc PAR PRÉFIXE : c'est le filet de sécurité qui attrape aussi
 * les fichiers dont la ligne en base a déjà disparu (ou un dossier d'upload
 * ajouté plus tard), sans maintenance d'une liste de clés.
 */
export async function deleteCloudinaryTenantAssets(
  tenantId: string
): Promise<{ deleted: number; errors: number }> {
  const prefix = `hajj-platform/${tenantId}/`;
  let deleted = 0;
  let errors = 0;

  for (const resourceType of ["image", "raw", "video"] as const) {
    try {
      const res = (await cloudinary.api.delete_resources_by_prefix(prefix, {
        resource_type: resourceType,
        invalidate: true,
      })) as { deleted?: Record<string, string> } | undefined;
      deleted += Object.keys(res?.deleted ?? {}).length;
    } catch {
      // Aucun fichier de ce type (ou erreur réseau) : on continue.
      errors++;
    }
  }

  // Dossiers devenus vides (`branding`, `payment-receipts`, `documents/<userId>`…)
  for (const folder of [
    `hajj-platform/${tenantId}/branding`,
    `hajj-platform/${tenantId}/payment-receipts`,
    `hajj-platform/${tenantId}/documents`,
    `hajj-platform/${tenantId}`,
  ]) {
    try {
      await cloudinary.api.delete_folder(folder, { recursive: true });
    } catch {
      // Dossier absent ou non vide (sous-dossiers) : sans gravité.
    }
  }

  return { deleted, errors };
}

export default cloudinary;
