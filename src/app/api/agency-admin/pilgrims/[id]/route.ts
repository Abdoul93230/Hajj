import { NextResponse } from "next/server";
import { requireAgencySession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// ─── PUT /api/agency-admin/pilgrims/[id] ─────────────────────────────────────
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { id } = await params;

  // Verify this pilgrim belongs to the tenant
  const existing = await prisma.user.findFirst({
    where: { id, tenantId, role: "PILGRIM" },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pèlerin introuvable" }, { status: 404 });
  }

  const body = await req.json();
  const {
    name,
    phone,
    gender,
    birthDate,
    city,
    country,
    address,
    profession,
    photoUrl,
    emergencyName,
    emergencyPhone,
    hasPassport,
    hasCni,
    hasVaccine,
    pilgrimStatus,
  } = body;

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(gender !== undefined && { gender: gender || null }),
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
      ...(city !== undefined && { city: city?.trim() || null }),
      ...(country !== undefined && { country: country?.trim() || null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(profession !== undefined && { profession: profession?.trim() || null }),
      ...(photoUrl !== undefined && { photoUrl: photoUrl?.trim() || null }),
      ...(emergencyName !== undefined && { emergencyName: emergencyName?.trim() || null }),
      ...(emergencyPhone !== undefined && { emergencyPhone: emergencyPhone?.trim() || null }),
      ...(hasPassport !== undefined && { hasPassport }),
      ...(hasCni !== undefined && { hasCni }),
      ...(hasVaccine !== undefined && { hasVaccine }),
      ...(pilgrimStatus !== undefined && { pilgrimStatus }),
    },
    include: {
      reservations: {
        include: { offer: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return NextResponse.json({ pilgrim: updated });
}

// ─── DELETE /api/agency-admin/pilgrims/[id] ───────────────────────────────────
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAgencySession();
  if (error) return error;
  const tenantId = session.tenantId;
  const { id } = await params;

  // Verify this pilgrim belongs to the tenant
  const existing = await prisma.user.findFirst({
    where: { id, tenantId, role: "PILGRIM" },
  });
  if (!existing) {
    return NextResponse.json({ error: "Pèlerin introuvable" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
