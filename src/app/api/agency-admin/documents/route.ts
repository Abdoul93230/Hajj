import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// GET /api/agency-admin/documents?userId=xxx
// Retourne tous les documents d'un pèlerin (ou de toute l'année si pas de userId)
export async function GET(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const currentYear = new Date().getFullYear();
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;
  const from = new Date(selectedYear, 0, 1);
  const to   = new Date(selectedYear + 1, 0, 1);

  const docs = await prisma.pilgrimDocument.findMany({
    where: {
      tenantId,
      ...(userId ? { userId } : {}),
      createdAt: { gte: from, lt: to },
    },
    include: {
      user: { select: { id: true, name: true, photoUrl: true, pilgrimStatus: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ documents: docs });
}

// POST /api/agency-admin/documents
export async function POST(req: Request) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;

  const body = await req.json();
  const { userId, type, status, label, fileUrl, expiresAt, notes } = body;

  if (!userId || !type) {
    return NextResponse.json({ error: "userId et type sont requis" }, { status: 400 });
  }

  const validTypes = ["PASSPORT", "CNI", "VACCINE", "VISA", "PHOTO", "MEDICAL", "OTHER"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
  }

  // Vérifier que le pèlerin appartient au tenant
  const pilgrim = await prisma.user.findFirst({ where: { id: userId, tenantId, role: "PILGRIM" } });
  if (!pilgrim) return NextResponse.json({ error: "Pèlerin introuvable" }, { status: 404 });

  // Dater dans l'année sélectionnée
  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const currentYear = new Date().getFullYear();
  const parsedYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const selectedYear = !isNaN(parsedYear) ? parsedYear : currentYear;
  const createdAt = selectedYear === currentYear ? new Date() : new Date(selectedYear, 0, 2);

  const doc = await prisma.pilgrimDocument.create({
    data: {
      tenantId,
      userId,
      type,
      status: status ?? "RECEIVED",
      label: label?.trim() || null,
      fileUrl: fileUrl?.trim() || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: notes?.trim() || null,
      createdBy: session.id,
      createdAt,
    },
    include: {
      user: { select: { id: true, name: true, photoUrl: true, pilgrimStatus: true } },
    },
  });

  // Mettre à jour les flags booléens sur le pèlerin
  await syncPilgrimFlags(tenantId, userId);

  return NextResponse.json({ document: doc }, { status: 201 });
}

// Helper : met à jour hasPassport / hasCni / hasVaccine sur le User
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
