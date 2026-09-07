import { NextResponse } from "next/server";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { uploadDocumentBuffer } from "@/lib/cloudinary";

export const runtime = "nodejs";

// POST /api/agency-admin/pilgrims/photo
// multipart/form-data : file, pilgrimId
export async function POST(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;

  const formData  = await req.formData();
  const file      = formData.get("file")      as File   | null;
  const pilgrimId = formData.get("pilgrimId") as string | null;

  if (!file || !pilgrimId) {
    return NextResponse.json({ error: "file et pilgrimId sont requis" }, { status: 400 });
  }

  // Vérifier que le pèlerin appartient au tenant
  const pilgrim = await prisma.user.findFirst({ where: { id: pilgrimId, tenantId, role: "PILGRIM" } });
  if (!pilgrim) return NextResponse.json({ error: "Pèlerin introuvable" }, { status: 404 });

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  let photoUrl: string;
  try {
    const result = await uploadDocumentBuffer(buffer, {
      folder:       `hajj-platform/${tenantId}/photos`,
      publicId:     `pilgrim-${pilgrimId}`,
      resourceType: "image",
    });
    photoUrl = result.secure_url;
  } catch (e) {
    console.error("Cloudinary upload error:", e);
    return NextResponse.json({ error: "Erreur lors de l'upload de la photo" }, { status: 500 });
  }

  const updated = await prisma.user.update({
    where: { id: pilgrimId },
    data:  { photoUrl },
    select: { id: true, photoUrl: true },
  });

  return NextResponse.json({ photoUrl: updated.photoUrl });
}
