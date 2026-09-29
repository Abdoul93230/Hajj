import { NextResponse } from "next/server";
import { requireAgencySession } from "@/lib/permissions";
import {
  uploadDocumentBuffer,
  extractCloudinaryPublicId,
  deleteCloudinaryFile,
} from "@/lib/cloudinary";

export const runtime = "nodejs";

// POST /api/agency-admin/payments/upload-receipt
// Multipart/form-data:
//   file: File (image jpg/png/webp ou PDF)
//   previousUrl?: string (optionnel, pour supprimer l'ancien justificatif si remplacement)
export async function POST(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const previousUrl = formData.get("previousUrl") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    // Taille max : 8 Mo
    const MAX_SIZE = 8 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Le fichier ne doit pas dépasser 8 Mo" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const allowed = ["jpg", "jpeg", "png", "webp", "pdf"];
    if (!allowed.includes(ext)) {
      return NextResponse.json(
        { error: "Format non supporté. Formats acceptés : JPG, PNG, WEBP, PDF" },
        { status: 400 }
      );
    }

    const resourceType: "image" | "raw" = ext === "pdf" ? "raw" : "image";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Supprimer l'ancien fichier si fourni
    if (previousUrl) {
      const oldPid = extractCloudinaryPublicId(previousUrl);
      if (oldPid) await deleteCloudinaryFile(oldPid).catch(() => {});
    }

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const publicId = resourceType === "raw"
      ? `recu-${Date.now()}-${randomSuffix}.${ext}`
      : `recu-${Date.now()}-${randomSuffix}`;

    const uploaded = await uploadDocumentBuffer(buffer, {
      folder: `hajj-platform/${tenantId}/payment-receipts`,
      publicId,
      resourceType,
    });

    return NextResponse.json({
      url: uploaded.secure_url,
      name: file.name,
      size: file.size,
    });
  } catch (err) {
    console.error("Payment receipt upload error:", err);
    return NextResponse.json(
      { error: "Échec de l'enregistrement du justificatif" },
      { status: 500 }
    );
  }
}
