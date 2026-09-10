import { NextResponse } from "next/server";
import { requirePilgrimSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryFile, uploadDocumentBuffer } from "@/lib/cloudinary";
import { logAction } from "@/lib/audit";

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo (comme l'admin côté upload)

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
    try {
      // PublicId fixe par type + pèlerin : écrase l'ancien fichier (comme l'admin)
      const result = await uploadDocumentBuffer(buffer, {
        folder: `hajj-platform/${tenantId}/documents/${userId}`,
        publicId: `${doc.type.toLowerCase()}-${userId}`,
        resourceType: ext === "pdf" ? "raw" : "image",
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

  await syncPilgrimFlags(session.tenantId, session.id);

  await logAction({
    session,
    action: "pilgrim.document_deleted",
    resource: "PilgrimDocument",
    resourceId: doc.id,
  });

  return NextResponse.json({ ok: true });
}
