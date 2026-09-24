import { NextResponse } from "next/server";
import { requirePilgrimSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  uploadDocumentBuffer,
  deleteCloudinaryFile,
  buildDocumentPublicId,
  extractCloudinaryPublicId,
} from "@/lib/cloudinary";
import { logAction } from "@/lib/audit";
import {
  isAgencyOnlyDocType,
  AGENCY_ONLY_ERROR,
  defaultDocumentLabel,
} from "@/lib/documents";
import { checkPilgrimPassport } from "@/lib/passport-check";
import { syncPilgrimFlags } from "@/lib/pilgrim-sync";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["PASSPORT", "CNI", "VISA", "PHOTO", "OTHER"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo
type DocType = "PASSPORT" | "CNI" | "VISA" | "PHOTO" | "OTHER";

// syncPilgrimFlags est importé de "@/lib/pilgrim-sync" (source unique).

// POST /api/pilgrim/documents/upload — multipart : file, type, label?, expiresAt?, number?
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
  const number = (formData.get("number") as string | null)?.trim() || null;

  if (!file || !type) {
    return NextResponse.json({ error: "Fichier et type de document requis" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
  }
  // Le VISA est géré par l'agence : le pèlerin ne peut pas l'envoyer lui-même.
  if (isAgencyOnlyDocType(type)) {
    return NextResponse.json({ error: AGENCY_ONLY_ERROR }, { status: 403 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  }
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    return NextResponse.json({ error: "Format accepté : image ou PDF" }, { status: 400 });
  }

  // ── Règle passeport : valide au moins 6 mois après la date de retour ───────
  // Le pèlerin ne peut pas envoyer un passeport non conforme : l'upload est
  // refusé (aucun fichier n'est envoyé sur Cloudinary).
  if (type === "PASSPORT") {
    const verdict = await checkPilgrimPassport(tenantId, userId, expiresAt);
    if (!verdict.ok) {
      return NextResponse.json({ error: verdict.message, code: verdict.code }, { status: 400 });
    }
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
  const resourceType: "image" | "raw" = ext === "pdf" ? "raw" : "image";

  let fileUrl: string;
  try {
    const result = await uploadDocumentBuffer(buffer, {
      folder: `hajj-platform/${tenantId}/documents/${userId}`,
      publicId: buildDocumentPublicId(type, userId, ext, resourceType),
      resourceType,
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
      // Libellé automatique : plus de champ « Libellé » dans l'interface
      label: label ?? defaultDocumentLabel(type),
      fileUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      number,
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
