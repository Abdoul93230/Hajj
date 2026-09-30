import { requireSelfPersonalisationContext } from "@/lib/agency-personalisation";
import ThemeColorEditor from "@/components/tenant-editors/ThemeColorEditor";

/** Couleurs de marque — édition par l'agence elle-même. */
export default async function AgencyCouleursPage() {
  const tenant = await requireSelfPersonalisationContext();
  return <ThemeColorEditor tenantId={tenant.id} theme={tenant.theme} />;
}
