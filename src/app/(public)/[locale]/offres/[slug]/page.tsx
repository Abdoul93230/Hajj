import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { resolveTenantSlugFromHost } from "@/lib/tenant-slug";
import StaticOfferDetail from "./StaticOfferDetail";
import DbOfferDetail from "./DbOfferDetail";

// Détail d'une offre :
//  1. Si le slug correspond à une offre DB de l'agence (active, tarif > 0)
//     → rendu dynamique depuis la base (ce que l'admin configure).
//  2. Sinon → fallback sur les offres curatées du fichier statique.
export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug")
    ?? resolveTenantSlugFromHost(headersList.get("host"));
  const tenant = tenantSlug
    ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    : null;

  const offer = tenant
    ? await prisma.offer.findFirst({
        where: { slug, tenantId: tenant.id, active: true, priceAdult: { gt: 0 } },
      })
    : null;

  if (offer) {
    return (
      <DbOfferDetail
        offer={{
          slug: offer.slug,
          type: offer.type as string,
          titleFr: offer.titleFr,
          titleEn: offer.titleEn,
          titleAr: offer.titleAr,
          descFr: offer.descFr,
          descEn: offer.descEn,
          descAr: offer.descAr,
          departureDate: offer.departureDate ? offer.departureDate.toISOString() : null,
          returnDate: offer.returnDate ? offer.returnDate.toISOString() : null,
          priceAdult: offer.priceAdult,
          priceChild: offer.priceChild,
          priceBaby: offer.priceBaby,
          priceCouple: offer.priceCouple,
          currency: offer.currency,
          provisional: offer.provisional,
          program:
            offer.data &&
            typeof offer.data === "object" &&
            Array.isArray((offer.data as { program?: unknown }).program)
              ? ((offer.data as { program: { step?: number; title?: string; content?: string }[] })
                  .program ?? null)
              : null,
        }}
      />
    );
  }

  return <StaticOfferDetail slug={slug} />;
}
