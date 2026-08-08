import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { uploadDocumentBuffer } from "@/lib/cloudinary";

export const runtime = "nodejs";

// POST /api/agency-admin/documents/upload
// multipart/form-data : file, userId, type, status?, label?, expiresAt?, notes?
export async function POST(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  const userId   = formData.get("userId") as string | null;
  const type     = formData.get("type") as string | null;
  const status   = (formData.get("status") as string | null) ?? "RECEIVED";
  const label    = (formData.get("label") as string | null)?.trim() || null;
  const expiresAt= formData.get("expiresAt") as string | null;
  const notes    = (formData.get("notes") as string | null)?.trim() || null;

  if (!file || !userId || !type) {
    return NextResponse.json({ error: "file, userId et type sont requis" }, { status: 400 });
  }

  const validTypes = ["PASSPORT", "CNI", "VACCINE", "VISA", "PHOTO", "MEDICAL", "OTHER"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
  }

  // Vérifier que le pèlerin appartient au tenant
  const pilgrim = await prisma.user.findFirst({ where: { id: userId, tenantId, role: "PILGRIM" } });
  if (!pilgrim) return NextResponse.json({ error: "Pèlerin introuvable" }, { status: 404 });

  // Upload vers Cloudinary
  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext    = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const publicId = `hajj-platform/${tenantId}/documents/${userId}/${type.toLowerCase()}-${Date.now()}`;

  let fileUrl: string;
  try {
    const result = await uploadDocumentBuffer(buffer, {
      folder: `hajj-platform/${tenantId}/documents/${userId}`,
      publicId: `${type.toLowerCase()}-${Date.now()}`,
      resourceType: ["pdf"].includes(ext) ? "raw" : "image",
    });
    fileUrl = result.secure_url;
  } catch (e) {
    console.error("Cloudinary upload error:", e);
    return NextResponse.json({ error: "Erreur lors de l'upload du fichier" }, { status: 500 });
  }

  // Dater dans l'année sélectionnée
  const cookieStore = await cookies();
  const cookieYear  = cookieStore.get("zam_selected_year")?.value;
  const currentYear = new Date().getFullYear();
  const parsedYear  = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;
  const createdAt    = selectedYear === currentYear ? new Date() : new Date(selectedYear, 0, 2);

  const doc = await prisma.pilgrimDocument.create({
    data: {
      tenantId,
      userId,
      type: type as "PASSPORT" | "CNI" | "VACCINE" | "VISA" | "PHOTO" | "MEDICAL" | "OTHER",
      status: status as "RECEIVED" | "VALID" | "EXPIRED" | "REJECTED",
      label,
      fileUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes,
      createdBy: session.id,
      createdAt,
    },
    include: {
      user: { select: { id: true, name: true, photoUrl: true, pilgrimStatus: true } },
    },
  });

  // Sync flags booléens
  await syncPilgrimFlags(tenantId, userId);

  // Supprimer l'import inutilisé
  void publicId;

  return NextResponse.json({ document: doc }, { status: 201 });
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
      hasVaccine:  types.has("VACCINE"),
    },
  });
}
