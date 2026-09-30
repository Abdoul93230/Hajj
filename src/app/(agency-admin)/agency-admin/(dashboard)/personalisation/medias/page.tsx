import { requireSelfPersonalisationContext } from "@/lib/agency-personalisation";
import ThemeMediaEditor from "@/components/tenant-editors/ThemeMediaEditor";

/** Images de marque (hero, bannières, galerie) — édition par l'agence elle-même. */
export default async function AgencyMediasPage() {
  const tenant = await requireSelfPersonalisationContext();
  return <ThemeMediaEditor tenantId={tenant.id} theme={tenant.theme} />;
}
