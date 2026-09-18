import type { Metadata } from "next";
import { headers } from "next/headers";
import { routing } from "@/i18n/routing";
import { getTenantBySlug } from "@/lib/tenant-data";
import { themeStyleTag } from "@/lib/tenant-theme";
import "../../globals.css";

// Layout minimal pour les pages d'impression (reçus pèlerin) :
// AUCUN Header / Footer / WhatsAppButton — uniquement le contenu,
// exactement comme la page reçu côté agency-admin.
// + injection des couleurs de marque du tenant (cohérence des reçus).
export const metadata: Metadata = {
  title: "Reçu de paiement",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenantSlug = (await headers()).get("x-tenant-slug") ?? "";
  const tenant = tenantSlug ? await getTenantBySlug(tenantSlug) : null;

  return (
    <>
      <style id="tenant-theme" dangerouslySetInnerHTML={{ __html: themeStyleTag(tenant?.theme) }} />
      {children}
    </>
  );
}
