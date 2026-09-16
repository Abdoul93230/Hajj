import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { isSuperAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getSmsStatsByTenant } from "@/lib/sms-service";
import { getSmsConfig, isSmsConfigured } from "@/lib/sms";
import SmsMonitorClient from "./SmsMonitorClient";

export const metadata: Metadata = { title: "Suivi SMS" };

/**
 * Suivi des SMS de toutes les agences (temps réel côté client : polling 10 s).
 * Les chiffres viennent de l'agrégation du journal SmsMessage — jamais d'un
 * compteur dénormalisé, donc jamais désynchronisés.
 */
export default async function SuperAdminMessagesPage() {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) redirect("/superadmin/login");

  const stats = await getSmsStatsByTenant("30d", undefined);

  return (
    <SmsMonitorClient
      initialStats={stats}
      initialRange="30d"
      sender={getSmsConfig().sender}
      configured={isSmsConfigured()}
    />
  );
}