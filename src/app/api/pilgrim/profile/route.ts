import { NextResponse } from "next/server";
import { requirePilgrimSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

// PATCH /api/pilgrim/profile
// Édition limitée par le pèlerin : téléphone, adresse, contact d'urgence.
// (nom, email, statut, documents → gérés par l'agence)
export async function PATCH(req: Request) {
  const { session, error } = await requirePilgrimSession();
  if (error) return error;

  const body = await req.json();
  const { phone, address, emergencyName, emergencyPhone } = body;

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: {
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(emergencyName !== undefined && { emergencyName: emergencyName?.trim() || null }),
      ...(emergencyPhone !== undefined && { emergencyPhone: emergencyPhone?.trim() || null }),
    },
    select: {
      id: true,
      phone: true,
      address: true,
      emergencyName: true,
      emergencyPhone: true,
    },
  });

  await logAction({
    session,
    action: "pilgrim.profile_updated",
    resource: "User",
    resourceId: session.id,
  });

  return NextResponse.json({ user: updated });
}
