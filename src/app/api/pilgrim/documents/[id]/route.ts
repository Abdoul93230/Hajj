import { NextResponse } from "next/server";
import { requirePilgrimSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  deleteCloudinaryFile,
  uploadDocumentBuffer,
  buildDocumentPublicId,
  extractCloudinaryPublicId,
} from "@/lib/cloudinary";
import { logAction } from "@/lib/audit";
import { isAgencyOnlyDocType, AGENCY_ONLY_ERROR } from "@/lib/documents";
import { checkPilgrimPassport } from "@/lib/passport-check";
import { syncPilgrimFlags } from "@/lib/pilgrim-sync";

// syncPilgrimFlags est importé de "@/lib/pilgrim-sync" (source unique).

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo (comme l'admin côté upload)

// PATCH /api/pilgrim/documents/[id] — multipart : file?, label?, expiresAt?
// Le pèlerin met à jour SON document tant qu'il n'a pas été vérifié (RECEIVED).
// — même logique que l'admin : nouvel upload Cloudinary (publicId fixe par type),
//   ancien fichier supprimé, ancien record remplacé, statut forcé à RECEIVED.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requirePilgrimSession();
  if (error) return error;
  const tenantId = session.tenantId;
  const userId = session.id;
  const { id } = await params;

  const doc = await prisma.pilgrimDocument.findFirst({
    where: { id, tenantId, userId },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }
  // Le VISA est géré par l'agence : aucune modification par le pèlerin.
  if (isAgencyOnlyDocType(doc.type)) {
    return NextResponse.json({ error: AGENCY_ONLY_ERROR }, { status: 403 });
  }
  if (doc.status !== "RECEIVED") {
    return NextResponse.json(
      { error: "Ce document a été vérifié par l'agence et ne peut plus être modifié." },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const hasLabel = formData.has("label");
  const hasExpiresAt = formData.has("expiresAt");
  const label = (formData.get("label") as string | null)?.trim() || null;
  const expiresAtRaw = formData.get("expiresAt") as string | null;

  if (!file && !hasLabel && !hasExpiresAt) {
    return NextResponse.json({ error: "Aucune modification fournie" }, { status: 400 });
  }

  // ── Règle passeport : valide au moins 6 mois après la date de retour ───────
  if (doc.type === "PASSPORT" && hasExpiresAt) {
    const verdict = await checkPilgrimPassport(tenantId, userId, expiresAtRaw);
    if (!verdict.ok) {
      return NextResponse.json({ error: verdict.message, code: verdict.code }, { status: 400 });
    }
  }

  let fileUrl = doc.fileUrl;
  if (file) {
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Format accepté : image ou PDF" }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const resourceType: "image" | "raw" = ext === "pdf" ? "raw" : "image";
    try {
      // PublicId fixe par type + pèlerin : écrase l'ancien fichier (comme l'admin)
      const result = await uploadDocumentBuffer(buffer, {
        folder: `hajj-platform/${tenantId}/documents/${userId}`,
        publicId: buildDocumentPublicId(doc.type, userId, ext, resourceType),
        resourceType,
      });
      fileUrl = result.secure_url;
    } catch (e) {
      console.error("Cloudinary upload error:", e);
      return NextResponse.json({ error: "Erreur lors de l'envoi du fichier" }, { status: 500 });
    }
  }

  const updated = await prisma.pilgrimDocument.update({
    where: { id },
    data: {
      ...(file ? { fileUrl, status: "RECEIVED" } : {}),
      ...(hasLabel ? { label } : {}),
      ...(hasExpiresAt ? { expiresAt: expiresAtRaw ? new Date(expiresAtRaw) : null } : {}),
    },
  });

  await syncPilgrimFlags(tenantId, userId);

  await logAction({
    session,
    action: "pilgrim.document_updated",
    resource: "PilgrimDocument",
    resourceId: doc.id,
  });

  return NextResponse.json({ document: updated });
}

// DELETE /api/pilgrim/documents/[id]
// Le pèlerin supprime SON document tant qu'il n'a pas été vérifié (RECEIVED).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requirePilgrimSession();
  if (error) return error;
  const { id } = await params;

  const doc = await prisma.pilgrimDocument.findFirst({
    where: { id, tenantId: session.tenantId, userId: session.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }
  // Le VISA est géré par l'agence : pas de suppression par le pèlerin.
  if (isAgencyOnlyDocType(doc.type)) {
    return NextResponse.json({ error: AGENCY_ONLY_ERROR }, { status: 403 });
  }
  if (doc.status !== "RECEIVED") {
    return NextResponse.json(
      { error: "Ce document a été vérifié par l'agence et ne peut plus être supprimé." },
      { status: 403 }
    );
  }

  await prisma.pilgrimDocument.delete({ where: { id } });

  if (doc.fileUrl) {
    const publicId = extractCloudinaryPublicId(doc.fileUrl);
    if (publicId) await deleteCloudinaryFile(publicId).catch(() => {});
  }

  await syncPilgrimFlags(session.tenantId, session.id, doc.fileUrl);

  await logAction({
    session,
    action: "pilgrim.document_deleted",
    resource: "PilgrimDocument",
    resourceId: doc.id,
  });

  return NextResponse.json({ ok: true });
}
