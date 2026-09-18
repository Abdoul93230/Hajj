import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Tenant courant — dédupliqué PAR REQUÊTE via le cache React.
 *
 * Layouts (public, agence, print) et pages demandent tous le tenant : sans
 * déduplication, une seule page HTTP déclenche plusieurs lookups MongoDB
 * identiques. Avec `cache()`, un slug = UN seul lookup par requête.
 * (Le thème d'un agence change rarement : pas besoin de cache cross-request.)
 */
export const getTenantBySlug = cache(async (slug: string) =>
  prisma.tenant.findUnique({ where: { slug } })
);
