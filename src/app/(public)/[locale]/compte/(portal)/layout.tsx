import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PortalNav from "./PortalNav";
import ForcePasswordChange from "./ForcePasswordChange";

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

  // Mot de passe provisoire imposé (création par l'agence ou réinitialisation) :
  // lu en base à chaque requête → la modale de changement est non contournable.
  const account = await prisma.user.findUnique({
    where: { id: session.id },
    select: { mustChangePassword: true },
  });

  return (
    <div className="bg-gray-50 min-h-[60vh] py-10">
      <div className="max-w-4xl mx-auto px-4">
        <PortalNav />
        {children}
        {account?.mustChangePassword && <ForcePasswordChange />}
      </div>
    </div>
  );
}
