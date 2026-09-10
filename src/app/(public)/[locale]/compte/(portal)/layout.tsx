import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import PortalNav from "./PortalNav";

// Layout du portail pèlerin (Mon dossier / Mes documents / Mon programme).
// Garde : session requise avec le rôle PILGRIM, sinon retour à /compte.
export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!session || session.role !== "PILGRIM") {
    redirect(`/${locale}/compte`);
  }

  return (
    <div className="bg-gray-50 min-h-[60vh] py-10">
      <div className="max-w-4xl mx-auto px-4">
        <PortalNav />
        {children}
      </div>
    </div>
  );
}
