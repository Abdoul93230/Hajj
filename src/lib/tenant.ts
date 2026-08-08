import "server-only";
import { prisma } from "@/lib/prisma";

// En dev : on résout le tenant depuis le path ou un header custom
// En prod : depuis le sous-domaine (zam.hajj-platform.com → slug "zam")
export function getTenantSlugFromHost(host: string): string | null {
  if (!host) return null;

  // Domaine local de dev : localhost:3000 → pas de tenant (superadmin)
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return null;

  // superadmin.localhost:3000 → null (superadmin)
  if (host.startsWith("superadmin.")) return null;

  // dashboard.zam.localhost:3000 → "zam"
  // zam.localhost:3000 → "zam"
  const parts = host.split(".");
  if (parts.length >= 2) {
    const prefix = parts[0];
    if (prefix === "dashboard") return parts[1] ?? null;
    return prefix;
  }

  return null;
}

export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({ where: { slug } });
}

export async function getTenantByDomain(domain: string) {
  return prisma.tenant.findUnique({ where: { customDomain: domain } });
}
