import { requireSelfPersonalisationContext } from "@/lib/agency-personalisation";
import ThemeLogoContactEditor from "@/components/tenant-editors/ThemeLogoContactEditor";

/** Logo & coordonnées — édition par l'agence elle-même. */
export default async function AgencyLogoContactPage() {
  const tenant = await requireSelfPersonalisationContext();
  return <ThemeLogoContactEditor tenantId={tenant.id} theme={tenant.theme} />;
}
