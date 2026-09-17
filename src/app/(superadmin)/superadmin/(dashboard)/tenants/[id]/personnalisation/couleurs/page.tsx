import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ThemeColorEditor from "./ThemeColorEditor";

export default async function CouleursPage({
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
  return <ThemeColorEditor tenantId={tenant.id} theme={tenant.theme} />;
}