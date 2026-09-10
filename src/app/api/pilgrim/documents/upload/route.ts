import { NextResponse } from "next/server";
import { requirePilgrimSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { uploadDocumentBuffer, deleteCloudinaryFile } from "@/lib/cloudinary";
import { logAction } from "@/lib/audit";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["PASSPORT", "CNI", "VISA", "PHOTO", "OTHER"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo
type DocType = "PASSPORT" | "CNI" | "VISA" | "PHOTO" | "OTHER";

function extractCloudinaryPublicId(url: string): string | null {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function syncPilgrimFlags(tenantId: string, userId: string) {
  const docs = await prisma.pilgrimDocument.findMany({
    where: { tenantId, userId, status: { in: ["RECEIVED", "VALID"] } },
    select: { type: true },
  });
  const types = new Set(docs.map((d) => d.type));
  await prisma.user.update({
    where: { id: userId },
    data: {
      hasPassport: types.has("PASSPORT"),
      hasCni: types.has("CNI"),
    },
  });
}

// POST /api/pilgrim/documents/upload — multipart : file, type, label?, expiresAt?
// Le pèlerin envoie SON document (statut RECEIVED — l'agence valide ensuite).
export async function POST(req: Request) {
  const { session, error } = await requirePilgrimSession();
  if (error) return error;
  const tenantId = session.tenantId;
  const userId = session.id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string | null;
  const label = (formData.get("label") as string | null)?.trim() || null;
  const expiresAt = formData.get("expiresAt") as string | null;

  if (!file || !type) {
    return NextResponse.json({ error: "Fichier et type de document requis" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  }
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Format accepté : image ou PDF" }, { status: 400 });
  }

  // Un seul document par type : on remplace l'existant (même logique que l'admin)
  const existingDoc = await prisma.pilgrimDocument.findFirst({
    where: { tenantId, userId, type: type as DocType },
    orderBy: { createdAt: "desc" },
    select: { id: true, fileUrl: true },
  });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";

  let fileUrl: string;
  try {
    const result = await uploadDocumentBuffer(buffer, {
      folder: `hajj-platform/${tenantId}/documents/${userId}`,
      publicId: `${type.toLowerCase()}-${userId}`,
      resourceType: ext === "pdf" ? "raw" : "image",
    });
    fileUrl = result.secure_url;
  } catch (e) {
    console.error("Cloudinary upload error:", e);
    return NextResponse.json({ error: "Erreur lors de l'envoi du fichier" }, { status: 500 });
  }

  if (existingDoc) {
    if (existingDoc.fileUrl) {
      const oldPublicId = extractCloudinaryPublicId(existingDoc.fileUrl);
      if (oldPublicId) await deleteCloudinaryFile(oldPublicId).catch(() => {});
    }
    await prisma.pilgrimDocument.delete({ where: { id: existingDoc.id } }).catch(() => {});
  }

  const doc = await prisma.pilgrimDocument.create({
    data: {
      tenantId,
      userId,
      type: type as DocType,
      status: "RECEIVED",
      label,
      fileUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: session.id,
    },
  });

  await syncPilgrimFlags(tenantId, userId);

  await logAction({
    session,
    action: "pilgrim.document_uploaded",
    resource: "PilgrimDocument",
    resourceId: doc.id,
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
