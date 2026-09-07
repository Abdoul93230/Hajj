import { NextResponse } from "next/server";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteCloudinaryFile } from "@/lib/cloudinary";

function extractCloudinaryPublicId(url: string): string | null {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return match ? match[1] : null;
  } catch { return null; }
}

// PATCH /api/agency-admin/documents/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { id } = await params;

  const existing = await prisma.pilgrimDocument.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  const body = await req.json();
  const { status, label, fileUrl, expiresAt, notes } = body;

  const validStatuses = ["RECEIVED", "VALID", "EXPIRED", "REJECTED"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const updated = await prisma.pilgrimDocument.update({
    where: { id },
    data: {
      ...(status    !== undefined && { status }),
      ...(label     !== undefined && { label: label?.trim() || null }),
      ...(fileUrl   !== undefined && { fileUrl: fileUrl?.trim() || null }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      ...(notes     !== undefined && { notes: notes?.trim() || null }),
    },
    include: {
      user: { select: { id: true, name: true, photoUrl: true, pilgrimStatus: true } },
    },
  });

  // Resync flags
  await syncPilgrimFlags(tenantId, existing.userId);

  return NextResponse.json({ document: updated });
}

// DELETE /api/agency-admin/documents/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { id } = await params;

  const existing = await prisma.pilgrimDocument.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  await prisma.pilgrimDocument.delete({ where: { id } });

  // Supprimer le fichier sur Cloudinary (silencieux si déjà supprimé)
  if (existing.fileUrl) {
    const publicId = extractCloudinaryPublicId(existing.fileUrl);
    if (publicId) await deleteCloudinaryFile(publicId).catch(() => {});
  }

  await syncPilgrimFlags(tenantId, existing.userId);

  return NextResponse.json({ ok: true });
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
      hasCni:      types.has("CNI"),
    },
  });
}
