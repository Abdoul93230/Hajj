import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PersonnalisationNav from "./PersonnalisationNav";

export const metadata: Metadata = { title: "Personnalisation agence" };

export default async function PersonnalisationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!tenant || tenant.status === "PLATFORM") notFound();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Personnalisation — {tenant.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Personnalisez l&apos;apparence et les textes du portail public et de l&apos;espace agence.
          Les modifications sont visibles immédiatement après enregistrement.
        </p>
      </div>
      <PersonnalisationNav tenantId={id} />
      {children}
    </div>
  );
}