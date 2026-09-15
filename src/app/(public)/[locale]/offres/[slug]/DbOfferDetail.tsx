"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Calendar, Clock, ChevronRight, Users } from "lucide-react";
import IconWhatsApp from "@/components/ui/IconWhatsApp";

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
  program: { step?: number; title?: string; content?: string }[] | null;
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

  const accent = isHajj ? "bg-amber-700" : "bg-[#0f5132]";
  const btn = isHajj ? "bg-amber-600 hover:bg-amber-500" : "bg-[#0f5132] hover:bg-[#157347]";

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[45vh] flex items-end overflow-hidden bg-[#06251a]">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/kaaba.jpg')" }} />
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
              <span className="w-10 h-10 rounded-xl bg-[#0f5132]/10 text-[#0f5132] flex items-center justify-center">
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
              <span className="w-10 h-10 rounded-xl bg-[#0f5132]/10 text-[#0f5132] flex items-center justify-center">
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
              <span className="w-10 h-10 rounded-xl bg-[#0f5132]/10 text-[#0f5132] flex items-center justify-center">
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
                    p.highlight ? "bg-[#0f5132] text-white border-[#0f5132]" : "bg-white border-gray-100"
                  }`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${p.highlight ? "text-white/70" : "text-gray-400"}`}>
                    {p.label}
                  </p>
                  <p className={`text-xl font-black ${p.highlight ? "text-white" : "text-[#0f5132]"}`}>
                    {p.value.toLocaleString("fr-FR")}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${p.highlight ? "text-white/60" : "text-gray-400"}`}>
                    {offer.currency} {t("perPerson")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Programme (si renseigné par l'agence) */}
          {offer.program && offer.program.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t("programTitle")}</h2>
              <ol className="space-y-3">
                {offer.program.map((step, i) => (
                  <li key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
                    <span className="w-8 h-8 rounded-full bg-[#0f5132]/10 text-[#0f5132] text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {step.step ?? i + 1}
                    </span>
                    <div>
                      {step.title && <p className="text-sm font-bold text-gray-900">{step.title}</p>}
                      {step.content && <p className="text-sm text-gray-500 mt-0.5">{step.content}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* CTA */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs text-gray-400">{t("fromLabel")}</p>
              <p className="text-3xl font-black text-[#0f5132]">
                {offer.priceAdult.toLocaleString("fr-FR")}{" "}
                <span className="text-sm font-medium text-gray-400">{offer.currency} {t("perPerson")}</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {closed ? (
                <span className="flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-xl bg-gray-100 text-gray-400">
                  Inscriptions fermées
                </span>
              ) : (
                <a href="https://wa.me/22791882121" target="_blank" rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-xl text-white transition-all hover:scale-105 ${btn}`}>
                  <Users size={14} /> {t("bookBtn")}
                </a>
              )}
              <Link href="/compte/voyages"
                className="flex items-center justify-center gap-2 font-semibold text-sm px-6 py-3 rounded-xl border-2 border-[#0f5132] text-[#0f5132] hover:bg-emerald-50 transition-all">
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
