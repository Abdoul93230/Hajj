// Résolution du slug de tenant depuis le host d'une requête.
//
// ⚠️ Fichier PUR : aucun import prisma ni "server-only" — consommable par le
// middleware (runtime Edge) comme par les routes API (Node).
//
// Le middleware n'injecte PAS x-tenant-slug sur les routes /api (son matcher
// exclut "api") : les routes API publiques utilisent cette fonction en fallback,
// avec exactement la même logique que resolveSpaceFromHost (src/middleware.ts).
//
// Chaîne de résolution recommandée dans une route :
//   headersList.get("x-tenant-slug")
//     ?? resolveTenantSlugFromHost(headersList.get("host"))
//
//   zam.hajj-platform.com    → "zam"                        (portail public, prod)
//   dashboard.zam.hajj-…     → "zam"                        (admin agence)
//   admin.hajj-platform.com  → null                         (espace superadmin)
//   localhost:3000           → DEV_DEFAULT_TENANT ?? "zam"  (dev single-domain)
export function resolveTenantSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null;

  const h = host.split(":")[0];
  const parts = h.split(".");

  if (parts[0] === "superadmin" || parts[0] === "admin") return null;
  if (parts[0] === "dashboard" && parts.length >= 2) return parts[1] ?? null;
  if (parts[0] !== "localhost" && parts[0] !== "127" && parts.length >= 2) return parts[0];

  // localhost, 127.* ou hôte sans sous-domaine exploitable → dev single-domain
  return process.env.DEV_DEFAULT_TENANT ?? "zam";
}
