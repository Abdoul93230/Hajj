import { requireSelfPersonalisationContext } from "@/lib/agency-personalisation";
import { buildThemeTextEditorData } from "@/lib/tenant-theme-catalog";
import ThemeTextEditor from "@/components/tenant-editors/ThemeTextEditor";

/**
 * Textes du portail — édition par l'agence elle-même (mêmes slots, mêmes
 * statiques de repli que la console superadmin : catalogue partagé).
 */
export default async function AgencyTextesPage() {
  const tenant = await requireSelfPersonalisationContext();
  const { groups, metaKey, metaStatics, metaOverride } = await buildThemeTextEditorData(
    tenant.theme
  );

  return (
    <ThemeTextEditor
      tenantId={tenant.id}
      groups={groups}
      metaKey={metaKey}
      metaStatics={metaStatics}
      metaOverride={metaOverride}
    />
  );
}
