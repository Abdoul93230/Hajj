// ─────────────────────────────────────────────────────────────────────────────
// Contrôle serveur de la règle passeport (validité ≥ 6 mois après le retour)
//
// Source unique utilisée par les routes d'upload et de mise à jour, côté agence
// (/api/agency-admin/documents/*) comme côté pèlerin (/api/pilgrim/documents/*).
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";
import {
  checkPassportValidity,
  type PassportVerdict,
  type TripDates,
} from "@/lib/documents";

/**
 * Dates du voyage du pèlerin (sa dernière réservation), utilisées comme
 * référence pour la validité du passeport.
 */
export async function getPilgrimTripDates(
  tenantId: string,
  userId: string,
): Promise<TripDates | null> {
  const reservation = await prisma.reservation.findFirst({
    where: { tenantId, userId },
    orderBy: { createdAt: "desc" },
    select: { offer: { select: { departureDate: true, returnDate: true } } },
  });
  return reservation?.offer ?? null;
}

/**
 * Applique la règle passeport à un pèlerin : la date d'expiration fournie doit
 * couvrir 6 mois après le retour de son voyage.
 *
 * Retour : verdict `ok: false` (avec `code` + message prêt à afficher) si le
 * passeport doit être recalé.
 */
export async function checkPilgrimPassport(
  tenantId: string,
  userId: string,
  expiresAt: Date | string | null | undefined,
): Promise<PassportVerdict> {
  const trip = await getPilgrimTripDates(tenantId, userId);
  return checkPassportValidity(expiresAt, trip);
}
