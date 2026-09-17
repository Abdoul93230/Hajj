import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ThemeTextEditor from "./ThemeTextEditor";

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
  return <ThemeTextEditor tenantId={tenant.id} theme={tenant.theme} />;
}