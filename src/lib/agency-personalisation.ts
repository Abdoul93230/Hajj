// ─── Personnalisation autonome de l'agence ───────────────────────────────────
//
// Contexte serveur des pages /agency-admin/personalisation/* : l'agence connectée
// ne peut personnaliser que SON thème, et seulement si la plateforme a ouvert la
// fonctionnalité (`Tenant.selfPersonalization`). Fermé = retour au tableau de bord
// (aucune page « personnalisation » ne doit rester accessible par URL directe).

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export type SelfPersonalisationTenant = {
  id: string;
  name: string;
  theme: unknown;
};

export async function requireSelfPersonalisationContext(): Promise<SelfPersonalisationTenant> {
  const session = await getSession();
  if (!session) redirect("/agency-admin/login");

  // Seul l'ADMIN de l'agence personnalise (un agent n'a pas cette main) ; le
  // superadmin, lui, passe par sa propre console /superadmin/tenants/[id].
  if (session.role !== "AGENCY_ADMIN") redirect("/agency-admin");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { id: true, name: true, theme: true, selfPersonalization: true },
  });

  // Agence inconnue ou fonctionnalité non activée par la plateforme : on ne
  // laisse rien deviner (ni la page, ni le flag).
  if (!tenant || tenant.selfPersonalization !== true) redirect("/agency-admin");

  return { id: tenant.id, name: tenant.name, theme: tenant.theme };
}
