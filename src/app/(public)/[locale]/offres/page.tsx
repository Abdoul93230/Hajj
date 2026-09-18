import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Calendar, Clock, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant-data";
import { resolveTenantSlugFromHost } from "@/lib/tenant-slug";
import { waLink } from "@/lib/contact";

// Inscriptions fermées dès que la date de départ est atteinte (départ aujourd'hui inclus)
function isBookingClosed(departureDate: Date | null): boolean {
  if (!departureDate) return false;
  const departStart = new Date(departureDate);
  departStart.setHours(0, 0, 0, 0);
  return new Date() >= departStart;
}

export default async function OffresPage() {
  const t = await getTranslations("offers");

  // Offres réelles de l'agence (résolution tenant : header middleware puis host).
  // On masque les brouillons (tarif 0) : seul ce que l'admin a finalisé est public.
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug")
    ?? resolveTenantSlugFromHost(headersList.get("host"));
  // Dédupliqué par requête (React cache) — voir lib/tenant-data.ts
  const tenant = tenantSlug ? await getTenantBySlug(tenantSlug) : null;

  // Lien WhatsApp du tenant (masqué si non configuré — jamais un autre numéro)
  const theme = (tenant?.theme ?? {}) as Record<string, unknown>;
  const waHref = waLink(typeof theme.whatsappNumber === "string" ? theme.whatsappNumber : null);

  const dbOffers = tenant
    ? await prisma.offer.findMany({
        where: { tenantId: tenant.id, active: true, priceAdult: { gt: 0 } },
        include: {
          _count: { select: { reservations: { where: { status: "CONFIRMED" } } } },
        },
        orderBy: [{ type: "asc" }, { departureDate: "asc" }],
      })
    : [];

  // ── Année en cours uniquement ──────────────────────────────────────────────
  // Une offre appartient à une saison via seasonYear (fallback : année de la
  // date de départ, puis année de création). Les saisons passées ne sont pas
  // affichées ; celles de l'année en cours le sont, avec un statut.
  const currentYear = new Date().getFullYear();

  const offers = dbOffers
    .map((o) => {
      const seasonYear =
        o.seasonYear ??
        (o.departureDate
          ? new Date(o.departureDate).getFullYear()
          : new Date(o.createdAt).getFullYear());
      const maxCapacity =
        o.data && typeof o.data === "object" && "maxCapacity" in (o.data as object)
          ? (o.data as { maxCapacity?: number }).maxCapacity ?? 0
          : 0;
      const confirmed = o._count.reservations;
      return {
        id: o.id,
        slug: o.slug,
        type: o.type as string,
        title: o.titleFr,
        desc: o.descFr,
        departureDate: o.departureDate ? o.departureDate.toISOString() : null,
        returnDate: o.returnDate ? o.returnDate.toISOString() : null,
        durationDays:
          o.departureDate && o.returnDate
            ? Math.max(
                1,
                Math.round(
                  (new Date(o.returnDate).getTime() - new Date(o.departureDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : null,
        priceAdult: o.priceAdult,
        currency: o.currency,
        provisional: o.provisional,
        seasonYear,
        // Expiré = date de départ atteinte · Complet = capacité atteinte
        expired: isBookingClosed(o.departureDate),
        soldOut: maxCapacity > 0 && confirmed >= maxCapacity,
      };
    })
    .filter((o) => o.seasonYear === currentYear)
    .sort((a, b) => {
      // Hajj d'abord (1 offre/an), puis Omra par date de départ (sans date à la fin)
      if (a.type !== b.type) return a.type === "HAJJ" ? -1 : 1;
      if (!a.departureDate) return 1;
      if (!b.departureDate) return -1;
      return a.departureDate.localeCompare(b.departureDate);
    });

  const hajjOffers = offers.filter((o) => o.type === "HAJJ");
  const umrahOffers = offers.filter((o) => o.type !== "HAJJ");

  return (
    <>
      {/* Hero */}
      <section className="relative bg-brand-deep py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/images/kaaba.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-deep/80 to-brand-deep" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label text-amber-400 mb-3">{t("heroLabel2")}</p>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4" style={{ fontFamily: "var(--font-playfair, serif)" }}>
            {t("heroTitle2")}
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">{t("heroSubtitle2")}</p>
        </div>
      </section>

      {/* Offers — organisation par saison : Hajj (1/an) puis Omra (plusieurs départs) */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {offers.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
              <p className="text-gray-500 text-sm">{t("soon")}</p>
            </div>
          )}

          {[
            { key: "hajj" as const, list: hajjOffers },
            { key: "umrah" as const, list: umrahOffers },
          ].map(({ key, list }) =>
            list.length > 0 ? (
              <div key={key}>
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-lg">
                    {key === "hajj" ? "🕋" : "🕌"}
                  </span>
                  <div>
                    <h2 className="text-2xl font-black text-gray-900" style={{ fontFamily: "var(--font-playfair, serif)" }}>
                      {t(key)}
                    </h2>
                    <p className="text-xs text-gray-400">
                      {key === "hajj"
                        ? "Une seule offre par saison — le Hajj a lieu une fois par an."
                        : "Plusieurs départs dans l'année, au choix de l'agence."}
                    </p>
                  </div>
                </div>
                <div className="space-y-8">
                    {list.map((offer) => {
                      const available = !offer.expired && !offer.soldOut;
                      return (
                        <div key={offer.id} id={offer.slug}
                          className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-24 hover:shadow-lg transition-shadow">

                          {/* Header band */}
                          <div className={`px-6 py-4 flex items-center justify-between gap-3 ${
                            offer.type === "HAJJ" ? "bg-gold-dark" : "bg-primary"
                          } text-white`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full tracking-wider flex-shrink-0">
                                {t(offer.type === "HAJJ" ? "hajj" : "umrah")}
                              </span>
                              <h3 className="font-bold text-lg truncate">{offer.title}</h3>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {offer.provisional && (
                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white">
                                  {t("provisional")}
                                </span>
                              )}
                              {offer.expired ? (
                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-black/30 text-white/80">
                                  Expiré
                                </span>
                              ) : offer.soldOut ? (
                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-red-900/70 text-white">
                                  Complet
                                </span>
                              ) : (
                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white">
                                  {t("reserve")}
                                </span>
                              )}
                            </div>
                          </div>
                            <div className="p-6 md:p-8">
                              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start">
                                {/* Left — stats + description */}
                                <div>
                                  <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600">
                                    {offer.departureDate && (
                                      <span className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-primary" />
                                        {t("departure")} : <strong className="text-gray-900">
                                          {new Date(offer.departureDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                        </strong>
                                      </span>
                                    )}
                                    {offer.returnDate && (
                                      <span className="flex items-center gap-1.5">
                                        <Calendar size={14} className="text-primary" />
                                        {t("return")} : <strong className="text-gray-900">
                                          {new Date(offer.returnDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                                        </strong>
                                      </span>
                                    )}
                                    {offer.durationDays && (
                                      <span className="flex items-center gap-1.5">
                                        <Clock size={14} className="text-primary" />
                                        {offer.durationDays} {t("nights")}
                                      </span>
                                    )}
                                  </div>

                                  {offer.desc && (
                                    <p className="text-sm text-gray-500 line-clamp-3">{offer.desc}</p>
                                  )}
                                </div>

                                {/* Right — price + CTA */}
                                <div className="md:min-w-[200px] flex flex-col items-center md:items-end gap-4">
                                  <div className="text-center md:text-right">
                                    <p className="text-xs text-gray-400 mb-1">{t("fromLabel")}</p>
                                    <p className="text-3xl font-black text-primary">
                                      {offer.priceAdult.toLocaleString("fr-FR")}
                                    </p>
                                    <p className="text-sm text-gray-500">{offer.currency} {t("perPerson")}</p>
                                  </div>
                                  <div className="flex flex-col gap-2 w-full md:w-auto">
                                    <Link href={`/offres/${offer.slug}` as `/offres/${string}`}
                                      className={`flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-xl text-white transition-all hover:scale-105 ${
                                        offer.type === "HAJJ" ? "bg-gold hover:bg-gold-light" : "bg-primary hover:bg-primary-light"
                                      }`}>
                                      {t("details")} <ArrowRight size={14} />
                                    </Link>
                                    {available && waHref && (
                                      <a href={waHref} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 font-semibold text-sm px-6 py-3 rounded-xl border-2 border-primary text-primary hover:bg-cream transition-all">
                                        <Users size={14} /> {t("bookBtn")}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                      );
                    })}

                </div>
              </div>
            ) : null
          )}

        </div>
      </section>
    </>
  );
}
