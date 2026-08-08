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

export async function deleteCloudinaryFile(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  } catch {
    // Ignorer si déjà supprimé
  }
}

export default cloudinary;
