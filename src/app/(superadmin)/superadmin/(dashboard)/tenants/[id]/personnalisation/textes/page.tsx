import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildThemeTextEditorData } from "@/lib/tenant-theme-catalog";
import ThemeTextEditor from "@/components/tenant-editors/ThemeTextEditor";

/**
 * Édition des textes du portail (espace superadmin).
 * Les données (catalogue des slots + statiques) sont construites par
 * `buildThemeTextEditorData` — le MÊME helper sert à l'espace agence.
 */
export default async function TextesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, theme: true, status: true },
  });
  if (!tenant || tenant.status === "PLATFORM") notFound();

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
