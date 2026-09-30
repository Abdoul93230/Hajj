import type { Metadata } from "next";
import { requireSelfPersonalisationContext } from "@/lib/agency-personalisation";
import PersonnalisationNav from "@/components/tenant-editors/PersonnalisationNav";

export const metadata: Metadata = { title: "Personnalisation" };

/**
 * Personnalisation par l'AGENCE elle-même (couleurs, logo, images, textes).
 * Accessible seulement si le superadmin a activé `selfPersonalization` pour
 * cette agence — sinon redirection vers le tableau de bord.
 */
export default async function AgencyPersonnalisationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await requireSelfPersonalisationContext();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Personnalisation — {tenant.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Apparence et textes de votre portail public et de votre espace. Les modifications
          sont visibles immédiatement après enregistrement.
        </p>
      </div>

      <PersonnalisationNav basePath="/agency-admin/personalisation" />
      {children}
    </div>
  );
}
