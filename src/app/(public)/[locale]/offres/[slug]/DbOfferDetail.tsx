"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Calendar, Clock, ChevronRight, Users, Plane, Hotel } from "lucide-react";
import IconWhatsApp from "@/components/ui/IconWhatsApp";
import { WaLink } from "@/components/tenant/ContactLinks";
import { type OfferProgramData } from "@/lib/offer-program";
import { useTenantBranding } from "@/components/tenant/TenantBranding";

export type DbOffer = {
  slug: string;
  type: string;
  titleFr: string;
  titleEn: string | null;
  titleAr: string | null;
  descFr: string;
  descEn: string | null;
  descAr: string | null;
  departureDate: string | null;
  returnDate: string | null;
  priceAdult: number;
  priceChild: number | null;
  priceBaby: number | null;
  priceCouple: number | null;
  currency: string;
  provisional: boolean;
  // Détail complet du voyage (source unique : Offer.data en DB)
  programData: OfferProgramData;
};

// Inscriptions fermées dès que la date de départ est atteinte
function isBookingClosed(departureDate: string | null): boolean {
  if (!departureDate) return false;
  const departStart = new Date(departureDate);
  departStart.setHours(0, 0, 0, 0);
  return new Date() >= departStart;
}

// Détail d'une offre DB (configurée par l'admin de l'agence)
export default function DbOfferDetail({ offer }: { offer: DbOffer }) {
  const t = useTranslations("offers");
  const locale = useLocale();

  const title =
    (locale === "en" && offer.titleEn) ||
    (locale === "ar" && offer.titleAr) ||
    offer.titleFr;
  const desc =
    (locale === "en" && offer.descEn) ||
    (locale === "ar" && offer.descAr) ||
    offer.descFr;

  const isHajj = offer.type === "HAJJ";
  const closed = isBookingClosed(offer.departureDate);
  const pd = offer.programData ?? {};
  const durationDays =
    offer.departureDate && offer.returnDate
      ? Math.max(
          1,
          Math.round(
            (new Date(offer.returnDate).getTime() - new Date(offer.departureDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const accent = isHajj ? "bg-gold-dark" : "bg-primary";
  const btn = isHajj ? "bg-gold hover:bg-gold-light" : "bg-primary hover:bg-primary-light";
  const banner = useTenantBranding()?.offersBannerUrl || "/images/kaaba.jpg";

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[45vh] flex items-end overflow-hidden bg-brand-deep">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url('${banner}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-4">
            <Link href="/" className="hover:text-white transition-colors">{t("breadHome")}</Link>
            <ChevronRight size={12} />
            <Link href="/offres" className="hover:text-white transition-colors">{t("breadOffers")}</Link>
            <ChevronRight size={12} />
            <span className="text-white/80">{title}</span>
          </div>
          <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full text-white mb-3 ${accent}`}>
            {t(isHajj ? "hajj" : "umrah")}{offer.provisional ? ` · ${t("provisional")}` : ""}
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-3" style={{ fontFamily: "var(--font-playfair, serif)" }}>
            {title}
          </h1>
          {desc && <p className="text-white/70 text-sm max-w-2xl">{desc}</p>}
        </div>
      </section>
      {/* DATES + TARIFS + PROGRAMME */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Calendar size={18} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("departure")}</p>
                <p className="text-sm font-bold text-gray-900">
                  {offer.departureDate ? fmtDate(offer.departureDate) : "—"}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Calendar size={18} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("return")}</p>
                <p className="text-sm font-bold text-gray-900">
                  {offer.returnDate ? fmtDate(offer.returnDate) : "—"}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Clock size={18} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t("durationLabel")}</p>
                <p className="text-sm font-bold text-gray-900">
                  {durationDays ? `${durationDays} ${t("nights")}` : "—"}
                </p>
              </div>
            </div>
          </div>
          {/* Tarifs */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t("priceTitle")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {([
                { label: t("adult"), value: offer.priceAdult, highlight: true },
                { label: t("couple"), value: offer.priceCouple },
                { label: t("child"), value: offer.priceChild },
                { label: t("baby"), value: offer.priceBaby },
              ].filter((p) => p.value !== null && p.value !== undefined) as { label: string; value: number; highlight?: boolean }[]).map((p) => (
                <div key={p.label}
                  className={`rounded-2xl p-5 text-center border shadow-sm ${
                    p.highlight ? "bg-primary text-white border-primary" : "bg-white border-gray-100"
                  }`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${p.highlight ? "text-white/70" : "text-gray-400"}`}>
                    {p.label}
                  </p>
                  <p className={`text-xl font-black ${p.highlight ? "text-white" : "text-primary"}`}>
                    {p.value.toLocaleString("fr-FR")}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${p.highlight ? "text-white/60" : "text-gray-400"}`}>
                    {offer.currency} {t("perPerson")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Points forts */}
          {(pd.highlights?.length ?? 0) > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pd.highlights!.map((h, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
                  <p className="text-2xl leading-none">{h.icon ?? "•"}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-2">
                    {h.label ?? ""}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{h.value ?? ""}</p>
                </div>
              ))}
            </div>
          )}

          {/* Vols */}
          {(pd.flights?.length ?? 0) > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Plane size={18} /> {t("tabVols")}
              </h2>
              <div className="space-y-3">
                {pd.flights!.map((f, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">
                        {f.direction && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded px-1.5 py-0.5 mr-2">
                            {f.direction}
                          </span>
                        )}
                        {f.airline ?? "—"} {f.flightNo ? `· ${f.flightNo}` : ""}
                      </span>
                      <span className="text-sm text-gray-600">
                        {f.from ?? "—"} → {f.to ?? "—"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {f.date ?? ""} {f.time ? `· ${f.time}` : ""}
                        {f.arrivalTime ? ` → ${f.arrivalTime}` : ""}
                      </span>
                    </div>
                    {(f.stopover || f.bagageSoute || f.bagageCabine) && (
                      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
                        {f.stopover && <span> {f.stopover}</span>}
                        {f.bagageSoute && <span>{t("soute")} {f.bagageSoute}</span>}
                        {f.bagageCabine && <span>{t("cabine")} {f.bagageCabine}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hôtels */}
          {(pd.hotels?.length ?? 0) > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Hotel size={18} /> {t("tabHotels")}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {pd.hotels!.map((h, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {h.city ?? "—"}
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-0.5">{h.name ?? "—"}</p>
                    {h.nights ? (
                      <p className="text-xs text-gray-500 mt-1">
                        {h.checkin ?? ""} {h.checkout ? `→ ${h.checkout}` : ""} · {h.nights} {t("nights")}
                      </p>
                    ) : (
                      (h.checkin || h.checkout) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {h.checkin ?? ""} {h.checkout ? `→ ${h.checkout}` : ""}
                        </p>
                      )
                    )}
                    {(h.distance || h.pension) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {h.distance ?? ""}
                        {h.distance && h.pension ? " · " : ""}
                        {h.pension ?? ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Programme jour par jour */}
          {(pd.program?.length ?? 0) > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t("programTitle")}</h2>
              <ol className="space-y-3">
                {pd.program!.map((step, i) => (
                  <li key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {step.day ?? i + 1}
                    </span>
                    <div>
                      {step.title && <p className="text-sm font-bold text-gray-900">{step.title}</p>}
                      {step.description && <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Inclus / Non inclus */}
          {((pd.included?.length ?? 0) > 0 || (pd.notIncluded?.length ?? 0) > 0) && (
            <div className="grid md:grid-cols-2 gap-6">
              {(pd.included?.length ?? 0) > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">{t("includedTitle")}</h3>
                  <ul className="space-y-1.5">
                    {pd.included!.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-green-500 font-bold flex-shrink-0">✓</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(pd.notIncluded?.length ?? 0) > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">{t("notIncludedTitle")}</h3>
                  <ul className="space-y-1.5">
                    {pd.notIncluded!.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-red-400 font-bold flex-shrink-0">✕</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Documents */}
          {(pd.documents?.length ?? 0) > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t("tabDocuments")}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {pd.documents!.map((doc, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                    <p className="text-sm font-bold text-gray-900">
                      {doc.icon ? `${doc.icon} ` : ""}
                      {doc.title ?? "—"}
                    </p>
                    {doc.content && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{doc.content}</p>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gold-dark bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3">
                {t("docWarning")}
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs text-gray-400">{t("fromLabel")}</p>
              <p className="text-3xl font-black text-primary">
                {offer.priceAdult.toLocaleString("fr-FR")}{" "}
                <span className="text-sm font-medium text-gray-400">{offer.currency} {t("perPerson")}</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {closed ? (
                <span className="flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-xl bg-gray-100 text-gray-400">
                  {t("closed")}
                </span>
              ) : (
                <WaLink className={`flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-xl text-white transition-all hover:scale-105 ${btn}`}>
                  <Users size={14} /> {t("bookBtn")}
                </WaLink>
              )}
              <Link href="/compte/voyages"
                className="flex items-center justify-center gap-2 font-semibold text-sm px-6 py-3 rounded-xl border-2 border-primary text-primary hover:bg-cream transition-all">
                {t("details")} <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <IconWhatsApp size={14} /> {t("contactWhatsapp")} · {t("contactHours")}
          </div>

        </div>
      </section>
    </>
  );
}
