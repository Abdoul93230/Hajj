import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import "../../globals.css";

// Layout minimal pour les pages d'impression (reçus pèlerin) :
// AUCUN Header / Footer / WhatsAppButton — uniquement le contenu,
// exactement comme la page reçu côté agency-admin.
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
  return <>{children}</>;
}
