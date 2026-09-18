"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Shield, Heart, Star, Users, ArrowRight, MapPin, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { useTenantBranding } from "@/components/tenant/TenantBranding";

const VALUE_ICONS = [
  <Shield key="shield" size={24} />,
  <Heart key="heart" size={24} />,
  <Star key="star" size={24} />,
  <Users key="users" size={24} />,
];
const GALLERY = [
  "/images/med.jpeg",
  "/images/medine - Copy.jpg",
  "/images/kaaba3.jpg",
  "/images/med2.jpeg",
  "/images/kaaba.jpg",
  "/images/medine - Copy.jpg",
];
const TEAM_IMAGES = ["/images/kaaba.jpg", "/images/medine - Copy.jpg"];
const STATS_VALUES = [{ value: 5, suffix: "+" }, { value: 200, suffix: "+" }, { value: 98, suffix: "%" }, { value: 2, suffix: "" }];

function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function useCounter(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = target / (duration / 16);
      const timer = setInterval(() => {
        start = Math.min(start + step, target);
        setCount(Math.floor(start));
        if (start >= target) clearInterval(timer);
      }, 16);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

function StatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCounter(value);
  return (
    <div className="text-center">
      <p className="text-4xl md:text-5xl font-black text-white mb-1">
        <span ref={ref}>{count}</span>{suffix}
      </p>
      <p className="text-cream-dark text-sm font-medium">{label}</p>
    </div>
  );
}

export default function NotreHistoirePage() {
  const t = useTranslations("history");
  useReveal();
  const [galleryIdx, setGalleryIdx] = useState(0);
  const branding = useTenantBranding();

  // Visuels personnalisables par tenant (fallback : images de la plateforme)
  const GALLERY_KEYS = [
    "historyGallery1Url",
    "historyGallery2Url",
    "historyGallery3Url",
    "historyGallery4Url",
    "historyGallery5Url",
    "historyGallery6Url",
  ] as const;
  const gallery = GALLERY.map((fallback, i) => branding?.[GALLERY_KEYS[i]] || fallback);
  const teamImages = [
    branding?.historyTeam1Url || TEAM_IMAGES[0],
    branding?.historyTeam2Url || TEAM_IMAGES[1],
  ];
  const historyBanner = branding?.makkahImageUrl || "/images/kaaba.jpg";

  const team = t.raw("team") as { name: string; role: string; tag: string; bio: string; bio2: string }[];
  const values = t.raw("values") as { title: string; desc: string }[];
  const timeline = t.raw("timeline") as { year: string; title: string; desc: string }[];
  const statsLabels = [t("statsExperience"), t("statsPilgrims"), t("statsSatisfaction"), t("statsCountries")];

  return (
    <div className="bg-white">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative bg-brand-deep min-h-[440px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image src={historyBanner} alt="La Kaaba" fill className="object-cover opacity-20" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-deep via-brand-deep/90 to-brand-deep/50" />
        </div>
        <div className="absolute right-10 top-10 w-72 h-72 rounded-full border border-white/5 hidden lg:block" />
        <div className="absolute right-24 top-24 w-48 h-48 rounded-full border border-white/5 hidden lg:block" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <nav className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white transition-colors">{t("breadHome")}</Link>
            <span>/</span>
            <span className="text-white/70">{t("breadcrumb")}</span>
          </nav>
          <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">{t("heroBadge")}</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-5 leading-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            {t("heroTitle")}
          </h1>
          <p className="text-white/60 text-lg max-w-xl leading-relaxed">{t("heroSubtitle")}</p>
          <div className="flex items-center gap-2 mt-6 text-white/50 text-sm">
            <MapPin size={14} className="text-amber-400" />
            {t("heroAddress")}
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────── */}
      <section className="bg-primary-dark">
        <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS_VALUES.map((s, i) => (
            <StatItem key={i} value={s.value} suffix={s.suffix} label={statsLabels[i]} />
          ))}
        </div>
      </section>

      {/* ── ÉQUIPE ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14 reveal">
          <p className="text-xs font-bold tracking-widest text-gold uppercase mb-3">{t("teamLabel")}</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            {t("teamTitle")}
          </h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">{t("teamSubtitle")}</p>
        </div>

        <div className="space-y-16">
          {team.map((member, i) => (
            <div key={i} className={`reveal grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? "lg:[direction:rtl]" : ""}`}>
              <div className="[direction:ltr]">
                <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-xl">
                  <Image src={teamImages[i] ?? teamImages[0]} alt={member.name} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/70 to-transparent" />
                  <div className="absolute bottom-5 left-5">
                    <span className="inline-block bg-gold-light text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      {member.tag}
                    </span>
                  </div>
                </div>
              </div>
              <div className="[direction:ltr] space-y-4">
                <div>
                  <p className="text-xs font-bold tracking-widest text-primary uppercase mb-1">{member.role}</p>
                  <h3 className="text-2xl md:text-3xl font-black text-gray-900"
                    style={{ fontFamily: "var(--font-playfair, serif)" }}>
                    {member.name}
                  </h3>
                </div>
                <p className="text-gray-600 leading-relaxed">{member.bio}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{member.bio2}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CITATION FONDATEUR ────────────────────────────── */}
      <section className="bg-brand-deep py-16 px-4">
        <div className="max-w-3xl mx-auto text-center reveal">
          <Quote size={36} className="text-primary mx-auto mb-6" />
          <blockquote className="text-2xl md:text-3xl font-bold text-white leading-snug mb-6"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            &laquo;&nbsp;{t("quoteText")}&nbsp;&raquo;
          </blockquote>
          <p className="text-cream-dark font-semibold">{t("quoteAuthor")}</p>
        </div>
      </section>

      {/* ── VALEURS ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14 reveal">
          <p className="text-xs font-bold tracking-widest text-gold uppercase mb-3">{t("valuesLabel")}</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            {t("valuesTitle")}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v, i) => (
            <div key={i} className="reveal group bg-white border border-gray-100 rounded-2xl p-6 hover:border-cream-dark hover:shadow-md transition-all text-center">
              <div className="w-14 h-14 rounded-2xl bg-cream border border-cream flex items-center justify-center text-primary mb-4 mx-auto group-hover:bg-primary group-hover:text-white transition-all">
                {VALUE_ICONS[i]}
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">{v.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TIMELINE ──────────────────────────────────────── */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14 reveal">
            <p className="text-xs font-bold tracking-widest text-gold uppercase mb-3">{t("timelineLabel")}</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900"
              style={{ fontFamily: "var(--font-playfair, serif)" }}>
              {t("timelineTitle")}
            </h2>
          </div>

          {/* Desktop alternating */}
          <div className="hidden md:block relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cream-dark -translate-x-1/2" />
            <div className="space-y-10">
              {timeline.map((item, i) => {
                const isLeft = i % 2 === 0;
                return (
                  <div key={i} className={`reveal flex items-start gap-6 ${!isLeft ? "flex-row-reverse" : ""}`}>
                    <div className={`w-[calc(50%-2.5rem)] ${!isLeft ? "text-right" : ""}`}>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow inline-block w-full">
                        <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-20 flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-primary border-4 border-white shadow-md ring-2 ring-cream-dark z-10" />
                      <span className="text-xs font-black text-primary bg-white border border-cream shadow-sm px-3 py-1 rounded-full">
                        {item.year}
                      </span>
                    </div>
                    <div className="w-[calc(50%-2.5rem)]" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile single column */}
          <div className="md:hidden relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-cream-dark" />
            <div className="space-y-7">
              {timeline.map((item, i) => (
                <div key={i} className="reveal relative flex gap-5 pl-12">
                  <div className="absolute left-3.5 top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-white shadow ring-2 ring-cream-dark z-10" />
                  <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <span className="inline-block text-xs font-black text-primary bg-cream border border-cream px-2.5 py-0.5 rounded-full mb-2">
                      {item.year}
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GALERIE ───────────────────────────────────────── */}
      <section id="galerie" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-10 reveal">
          <p className="text-xs font-bold tracking-widest text-gold uppercase mb-3">{t("galleryLabel")}</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            {t("galleryTitle")}
          </h2>
        </div>

        <div className="reveal relative rounded-3xl overflow-hidden aspect-video shadow-xl mb-4">
          <Image src={gallery[galleryIdx]} alt={t("galleryAlt")} fill className="object-cover transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/40 to-transparent" />
          <button onClick={() => setGalleryIdx(i => (i - 1 + gallery.length) % gallery.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-all">
            <ChevronLeft size={18} className="text-gray-800" />
          </button>
          <button onClick={() => setGalleryIdx(i => (i + 1) % gallery.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-all">
            <ChevronRight size={18} className="text-gray-800" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {gallery.map((_, i) => (
              <button key={i} onClick={() => setGalleryIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === galleryIdx ? "bg-white w-6" : "bg-white/50"}`} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {gallery.map((src, i) => (
            <button key={i} onClick={() => setGalleryIdx(i)}
              className={`relative rounded-xl overflow-hidden aspect-square transition-all ${i === galleryIdx ? "ring-2 ring-primary opacity-100" : "opacity-60 hover:opacity-90"}`}>
              <Image src={src} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      </section>

      {/* ── ACCRÉDITATIONS ────────────────────────────────── */}
      <section className="bg-gray-50 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center reveal">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-8">{t("accreditationsLabel")}</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { src: branding?.partnerIataUrl || "/images/IATA.webp",      alt: "IATA" },
              { src: branding?.partnerCohoUrl || "/images/coho.webp",      alt: "COHO" },
              { src: branding?.partnerMinistryUrl || "/images/min-hadjj.webp", alt: "Ministère du Hadj" },
            ].map(({ src, alt }) => (
              <div key={alt} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-5 hover:shadow-md transition-shadow">
                <Image src={src} alt={alt} width={90} height={45} className="object-contain max-h-10 w-auto" />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-5">{t("accreditationsText")}</p>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────── */}
      <section className="relative bg-brand-deep py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url('${historyBanner}')` }} />
        <div className="relative z-10 max-w-3xl mx-auto text-center reveal">
          <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">{t("ctaLabel")}</p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-5"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            {t("ctaTitle")}
          </h2>
          <p className="text-white/60 mb-8 text-base max-w-xl mx-auto">{t("ctaText")}</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/offres"
              className="inline-flex items-center gap-2 bg-gold-light hover:bg-amber-400 text-white font-bold px-8 py-3.5 rounded-full transition-all hover:scale-105 shadow-lg">
              {t("ctaOffers")} <ArrowRight size={16} />
            </Link>
            <Link href="/contact"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3.5 rounded-full border border-white/20 transition-all">
              {t("ctaContact")}
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
