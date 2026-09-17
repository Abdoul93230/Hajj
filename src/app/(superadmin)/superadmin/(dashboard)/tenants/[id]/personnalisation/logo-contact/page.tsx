import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ThemeLogoContactEditor from "./ThemeLogoContactEditor";

export default async function LogoContactPage({
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
  return <ThemeLogoContactEditor tenantId={tenant.id} theme={tenant.theme} />;
}