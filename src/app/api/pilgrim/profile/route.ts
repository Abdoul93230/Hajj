import { NextResponse } from "next/server";
import { requirePilgrimSession } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

// PATCH /api/pilgrim/profile
// Édition limitée par le pèlerin : téléphone, ville, pays, adresse, contact
// d'urgence. Mêmes champs que ceux marqués « recommandés » côté agence : ainsi
// le pèlerin peut compléter lui-même son dossier (nom, email, statut, documents
// et photo restent gérés par l'agence).
export async function PATCH(req: Request) {
  const { session, error } = await requirePilgrimSession();
  if (error) return error;

  const body = await req.json();
  const { phone, city, country, address, emergencyName, emergencyPhone } = body;

  const updated = await prisma.user.update({
    where: { id: session.id },
    data: {
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(city !== undefined && { city: city?.trim() || null }),
      ...(country !== undefined && { country: country?.trim() || null }),
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(emergencyName !== undefined && { emergencyName: emergencyName?.trim() || null }),
      ...(emergencyPhone !== undefined && { emergencyPhone: emergencyPhone?.trim() || null }),
    },
    select: {
      id: true,
      phone: true,
      city: true,
      country: true,
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
