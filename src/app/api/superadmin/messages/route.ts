import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";
import { checkCredits, getSmsConfig, isSmsConfigured, smsErrorMessage } from "@/lib/sms";
import { getSmsStatsByTenant, type SmsRange } from "@/lib/sms-service";

/**
 * Compteurs SMS plateforme (superadmin) — rafraîchi par polling côté page.
 * Les totaux sont calculés par agrégation : aucune valeur à resynchroniser.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const range = (searchParams.get("range") ?? "all") as SmsRange;
  const search = searchParams.get("q")?.trim() || undefined;

  const stats = await getSmsStatsByTenant(range, search);

  // Crédits opérateur : information d'appoint, jamais bloquante
  let credits: number | null = null;
  let creditsError: string | null = null;
  if (isSmsConfigured()) {
    try {
      const result = await checkCredits();
      credits = result.credits;
    } catch (err) {
      creditsError = smsErrorMessage(err);
    }
  }

  const config = getSmsConfig();

  return NextResponse.json({
    ...stats,
    credits,
    creditsError,
    configured: isSmsConfigured(),
    sender: config.sender,
    range,
    updatedAt: new Date().toISOString(),
  });
}
