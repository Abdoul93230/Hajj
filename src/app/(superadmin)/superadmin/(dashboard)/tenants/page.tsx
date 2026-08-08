import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import TenantsClient from "./TenantsClient";

export const metadata: Metadata = { title: "Agences" };

export default async function TenantsPage() {
  const tenants = await prisma.tenant.findMany({
    where: { status: { not: "PLATFORM" } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: { where: { role: { not: "SUPER_ADMIN" }, active: true } },
          reservations: true,
        },
      },
    },
  });

  const serialized = tenants.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    trialEndsAt: t.trialEndsAt?.toISOString() ?? null,
    theme: t.theme as Record<string, string> | null,
  }));

  return <TenantsClient initialTenants={serialized} />;
}
