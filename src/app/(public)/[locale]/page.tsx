"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import IconWhatsApp from "@/components/ui/IconWhatsApp";
import {
  ArrowRight, Check, Plus, AlertTriangle,
  Plane, Building2, Train, Users, ShieldCheck, CreditCard,
  Star, Award, MapPin, Phone, ChevronLeft, ChevronRight,
  Calendar, Clock, Heart, Sparkles,
} from "lucide-react";

/* ─────────────── DATA ─────────────────────────── */

const INCLUDED = [
  { Icon: Plane,       label: "Vols charter & réguliers" },
  { Icon: Building2,   label: "Hôtels proches du Haram" },
  { Icon: Train,       label: "Train Médine ↔ Makka" },
  { Icon: Users,       label: "Encadrement & guides" },
  { Icon: ShieldCheck, label: "Formules tout compris" },
  { Icon: CreditCard,  label: "Paiement en plusieurs fois" },
];

const STATS = [
  { value: "10+",    label: "Années d'expérience",  Icon: Award },
  { value: "500+",   label: "Pèlerins accompagnés", Icon: Users },
  { value: "5/5",    label: "Satisfaction client",   Icon: Star },
  { value: "2",      label: "Bureaux au Niger",      Icon: MapPin },
];

const UMRAH_SLOTS = [
  { title: "OUMRA AOÛT 2026", dates: "04 Aou. au 23 Aou. 2026", price: "1 250 000 FCFA/pers", badge: "Disponible", href: "/offres#umrah-2026" },
  { title: "OUMRA DÉCEMBRE 2026", dates: null, price: null, badge: "Bientôt", href: "/offres" },
  { title: "OUMRA JANVIER 2027", dates: null, price: null, badge: "Bientôt", href: "/offres" },
];

const UMRAH_RAMADAN_FEATURES = [
  "Vols charter & Vol réguliers",
  "Visa Oumra inclus : prise en charge médicale complète",
  "Accompagnement et cours inclus : guides expérimentés",
  "Médine : hôtels à environ 170 m de la mosquée",
  "La Mecque : hôtel à environ 600 m de la mosquée",
  "Vaccin carnet jaune nécessaire",
];

const HAJJ_FEATURES = [
  "Visa & constitution du dossier",
  "Vols charter et réguliers",
  "Hébergement proche du Haram",
  "Encadrement religieux et logistique",
];

const WHY_CHOOSE = [
  { title: "Fidèle à ses engagements", content: "Hajj et Oumra ZAM s'engage auprès de chaque pèlerin avec sérieux et professionnalisme. Le prix de votre Hadj = la récompense divine." },
  { title: "Plus de 500 pèlerins satisfaits", content: "Chaque année, des centaines de familles nigériennes nous confient leur pèlerinage. Leur satisfaction est notre plus grande récompense." },
  { title: "Présence à Niamey et Tahoua", content: "Avec nos bureaux à Kalley-Est (Niamey) et à Tahoua, nous sommes proches de vous pour vous accompagner dans toutes vos démarches." },
  { title: "Guides expérimentés et qualifiés", content: "Nos guides maîtrisent les rituels, parlent plusieurs langues et assurent un encadrement religieux et logistique de qualité tout au long du voyage." },
  { title: "Hébergement de premier choix", content: "Nous sélectionnons des hôtels à proximité immédiate des lieux saints pour vous garantir confort et facilité d'accès aux sites de dévotion." },
  { title: "Formules tout compris", content: "Vol, visa, hébergement, transport, repas : tout est inclus dans nos forfaits. Vous partez l'esprit libre, sans surprise financière." },
  { title: "Assistance sur place en Arabie Saoudite", content: "Notre équipe est également joignable en Arabie Saoudite au (+966) 05 44 61 74 67 pour vous assister durant votre séjour." },
];

const TESTIMONIALS = [
  { initial: "A", name: "Aminata D.", location: "Niamey", rating: 5, text: "Service exceptionnel, équipe très professionnelle. J'ai pu accomplir mon Oumra en toute sérénité. Je recommande vivement cette agence !" },
  { initial: "I", name: "Ibrahim K.", location: "Maradi", rating: 5, text: "Mon Hadj a été une expérience spirituelle parfaite. L'accompagnement du début à la fin était irréprochable. Qu'Allah vous récompense." },
  { initial: "F", name: "Fatoumata S.", location: "Tahoua", rating: 5, text: "Très bien organisé. Les hôtels étaient proches du Haram, les guides très compétents. Je repars l'année prochaine avec eux." },
  { initial: "O", name: "Oumarou H.", location: "Zinder", rating: 5, text: "Prix transparents, aucun frais caché. L'équipe est disponible à tout moment. Première Oumra inoubliable !" },
  { initial: "M", name: "Mariama B.", location: "Niamey", rating: 5, text: "Alhamdulillah, un voyage béni. L'agence Hajj et Oumra ZAM nous a accompagnés avec beaucoup de cœur et de professionnalisme." },
];

const FAQ = [
  { q: "Pourquoi faire la Oumra ?", a: "La Oumra est un acte d'adoration et de dévotion qui permet au croyant de se rapprocher d'Allah, d'obtenir le pardon et de renouveler sa foi. Contrairement au Hadj, elle peut s'effectuer à tout moment de l'année." },
  { q: "Y a-t-il des restrictions d'âge pour le pèlerinage ?", a: "Il n'y a pas de restriction d'âge formelle. Les enfants doivent être accompagnés d'un tuteur. Nous adaptons notre accompagnement à chaque profil de pèlerin." },
  { q: "Les vaccinations sont-elles obligatoires ?", a: "Oui, le vaccin contre la méningite est obligatoire. Le vaccin contre la fièvre jaune peut être requis selon les pays. Notre équipe vous guide dans toutes les démarches sanitaires." },
  { q: "Peut-on effectuer le Hadj ou la Oumra seul ?", a: "Il est fortement recommandé de voyager avec une agence agréée pour bénéficier d'un encadrement complet. Pour le Hadj, l'encadrement par une agence est obligatoire au Niger." },
  { q: "Quelles sont vos dates de départ et vos tarifs ?", a: "Oumra Août 2026 (04-23 Août) à partir de 1 250 000 FCFA/pers. Hadj 2027 à partir de 3 184 500 FCFA. Consultez notre page offres pour tous les détails." },
];

/* ─────────────── HOOKS ─────────────────────────── */

function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function useCounter(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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

/* ─────────────── COMPONENTS ────────────────────── */

function StatCard({ stat }: { stat: typeof STATS[0] }) {
  const numericVal = parseInt(stat.value.replace(/\D/g, ""));
  const suffix = stat.value.replace(/[0-9]/g, "");
  const { count, ref } = useCounter(numericVal);
  return (
    <div className="card-lift bg-white rounded-2xl p-6 text-center border border-emerald-100 shadow-sm">
      <div className="w-12 h-12 bg-[#0f5132] rounded-xl flex items-center justify-center mx-auto mb-3">
        <stat.Icon size={22} className="text-white" strokeWidth={1.8} />
      </div>
      <p className="text-3xl font-black text-[#0f5132] mb-1">
        <span ref={ref}>{count}</span>{suffix}
      </p>
      <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
    </div>
  );
}

function TestimonialCard({ t, active }: { t: typeof TESTIMONIALS[0]; active?: boolean }) {
  const colors = ["#065f46", "#b45309", "#1e40af", "#6d28d9", "#be185d"];
  const colorIdx = ["A", "I", "F", "O", "M"].indexOf(t.initial);
  return (
    <div className={`card-lift bg-white rounded-2xl p-6 shadow-sm border flex flex-col gap-3 transition-all duration-300 ${active ? "border-emerald-300 shadow-emerald-100 shadow-lg scale-105" : "border-gray-100"}`}>
      <div className="flex gap-0.5 mb-1">
        {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={14} className="text-orange-400 fill-orange-400" />)}
      </div>
      <p className="text-sm text-gray-600 leading-relaxed flex-1">&ldquo;{t.text}&rdquo;</p>
      <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: colors[colorIdx] ?? "#065f46" }}>
          {t.initial}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{t.name}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} />{t.location}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── PAGE ───────────────────────────── */

export default function HomePage() {
  const [whyOpen, setWhyOpen] = useState(0);
  const [faqOpen, setFaqOpen] = useState(-1);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  useReveal();

  // Auto-rotate testimonials
  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const visibleTestimonials = [0, 1, 2].map((offset) => (testimonialIdx + offset) % TESTIMONIALS.length);

  return (
    <>
      {/* ═══════════════ HERO ═══════════════════════════ */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#062b1a]">
        {/* BG image */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/hero-bg.jpg')" }} />
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#062b1a]/70 via-[#062b1a]/50 to-[#062b1a]/90" />
        {/* Decorative animated circles */}
        <div className="absolute top-1/4 right-10 w-72 h-72 rounded-full border border-white/10 animate-rotate-slow" />
        <div className="absolute top-1/4 right-10 w-48 h-48 rounded-full border border-white/10" style={{ animation: "rotateSlow 14s linear infinite reverse" }} />
        <div className="absolute bottom-32 left-8 w-32 h-32 rounded-full bg-emerald-500/10 animate-float" />
        <div className="absolute top-16 left-1/3 w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse delay-300" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6 animate-fade-up">
              <Sparkles size={14} className="text-orange-400" />
              <span className="text-xs text-white/90 font-medium tracking-wide">Agence certifiée Hadj & Oumra — Niger</span>
            </div>
            {/* Title */}
            <h1
              className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight animate-fade-up delay-100"
              style={{ fontFamily: "var(--font-playfair, serif)" }}
            >
              Votre voyage<br />
              <span className="text-gradient" style={{ WebkitTextFillColor: "transparent", background: "linear-gradient(90deg, #6ee7b7, #fbbf24)", WebkitBackgroundClip: "text" }}>
                vers les Lieux Saints
              </span>
            </h1>
            <p className="text-white/70 text-lg mb-8 max-w-xl leading-relaxed animate-fade-up delay-200">
              Hajj et Oumra ZAM vous accompagne pour accomplir votre Hadj et Oumra en toute sérénité — depuis Niamey jusqu&apos;aux Lieux Saints.
            </p>
            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 mb-10 animate-fade-up delay-300">
              {[
                { label: "OUMRA 2026", href: "/offres#umrah-2026", primary: true },
                { label: "OUMRA RAMADAN 2027", href: "/offres#umrah-ramadan", primary: false },
                { label: "HADJ 2027", href: "/offres#hajj-2027", primary: false },
              ].map((cta) => (
                <Link key={cta.label} href={cta.href}
                  className={`font-bold text-sm px-7 py-3.5 rounded-full tracking-wide transition-all hover:scale-105 active:scale-95 ${
                    cta.primary
                      ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500"
                      : "glass text-white hover:bg-white/20"
                  }`}>
                  {cta.label}
                </Link>
              ))}
            </div>
            {/* Quick contact */}
            <div className="flex items-center gap-4 animate-fade-up delay-400">
              <a href="tel:+22796969070" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm">
                <Phone size={14} /> +227 96 96 39 61
              </a>
              <span className="text-white/30">|</span>
              <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium">
                <IconWhatsApp size={16} />
                WhatsApp disponible
              </a>
            </div>
          </div>
        </div>

        {/* Bottom scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-5 h-8 rounded-full border-2 border-white/30 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 bg-white/60 rounded-full" />
          </div>
        </div>
      </section>

      {/* ═══════════════ TICKER ═══════════════════════ */}
      <div className="bg-amber-600 py-2.5 overflow-hidden">
        <div className="flex animate-ticker whitespace-nowrap">
          {[...Array(2)].map((_, k) => (
            <span key={k} className="flex items-center">
              {["Inscriptions Hadj 2027 ouvertes", "Oumra Août 2026 disponible", "Places limitées — réservez maintenant", "Accompagnement complet inclus", "Vols depuis Niamey"].map((item, i) => (
                <span key={i} className="inline-flex items-center gap-3 mx-6 text-white text-xs font-bold tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                  {item}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════ STATS ════════════════════════ */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="reveal">
                <StatCard stat={s} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ CE QUI EST INCLUS ═══════════ */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <p className="section-label mb-3">CE QUI EST INCLUS</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, serif)" }}>
              Tout pour un pèlerinage serein
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
            {INCLUDED.map(({ Icon, label }, i) => (
              <div key={label} className={`reveal delay-${i * 100 > 500 ? 500 : i * 100}`}>
                <div className="card-lift flex flex-col items-center text-center gap-3 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm group">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[#0f5132] shadow-lg shadow-[#0f5132]/20 group-hover:scale-110 transition-transform duration-300">
                    <Icon size={26} strokeWidth={1.8} className="text-white" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 leading-tight">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ URGENCY BANNER ══════════════ */}
      <div className="relative bg-gradient-to-r from-[#0f5132] via-[#0f5132] to-[#0a3d26] animate-gradient-shift py-4 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }} />
        <div className="relative max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-white text-center">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-300 flex-shrink-0" />
            <p className="text-sm font-semibold">🕌 Places limitées pour le <strong>Hadj 2027</strong> — Inscriptions en cours !</p>
          </div>
          <Link href="/offres#hajj-2027"
            className="flex-shrink-0 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-5 py-2 rounded-full transition-all hover:scale-105 shadow-lg">
            Réserver ma place →
          </Link>
        </div>
      </div>

      {/* ═══════════════ FONDATEUR ════════════════════ */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="reveal-left relative">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/560922223_122098605927071313_4417420479539281621_n.jpg')" }} />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a3d26]/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 glass rounded-xl p-3 text-white text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Heart size={14} className="text-orange-400 fill-orange-400" />
                  <span>Fondateur & Directeur — Hajj et Oumra ZAM</span>
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-amber-600 text-white rounded-2xl px-4 py-2 shadow-xl text-sm font-bold animate-float">
              La confiance
            </div>
          </div>
          <div className="reveal-right">
            <p className="section-label mb-3">NOTRE FONDATEUR</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-tight text-gray-900" style={{ fontFamily: "var(--font-playfair, serif)" }}>
              Une vocation au service<br />des pèlerins
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Animé par une profonde foi et un engagement sans faille envers les pèlerins, le fondateur de Hajj et Oumra ZAM a créé cette agence afin d&apos;offrir un service de qualité, basé sur la confiance et le dévouement.
            </p>
            <p className="text-gray-600 leading-relaxed mb-7">
              Depuis Niamey et Tahoua, il met son expertise au service des familles nigériennes qui souhaitent accomplir ce voyage béni dans les meilleures conditions. « Le prix de votre Hadj = la récompense divine. »
            </p>
            <Link href="/notre-histoire" className="btn-primary">
              Découvrir notre histoire <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ OUMRA ════════════════════════ */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <p className="section-label mb-2">AGENCE DE VOYAGE HADJ ET OUMRA</p>
            <h2 className="text-6xl md:text-8xl font-black text-[#0f5132]" style={{ fontFamily: "var(--font-playfair, serif)" }}>
              OUMRA
            </h2>
          </div>

          {/* 3 slots */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
            {UMRAH_SLOTS.map((slot, i) => (
              <Link key={slot.title} href={slot.href}
                className={`reveal delay-${i * 200} card-lift rounded-2xl border p-6 group transition-all ${
                  slot.dates ? "bg-white border-emerald-200 hover:border-emerald-400" : "bg-white border-gray-200"
                }`}>
                <div className="flex items-start justify-between mb-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    slot.dates ? "bg-emerald-100 text-[#0f5132]" : "bg-gray-100 text-gray-500"
                  }`}>
                    {slot.badge}
                  </span>
                  <Calendar size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </div>
                <p className="text-xs font-bold tracking-widest mb-2 uppercase text-[#0f5132]">{slot.title}</p>
                {slot.dates ? (
                  <>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                      <Clock size={13} className="text-orange-500" /> {slot.dates}
                    </div>
                    <p className="text-base font-bold text-[#0f5132]">à partir de {slot.price}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#0f5132] group-hover:gap-2 transition-all">
                      Voir les détails <ArrowRight size={13} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 italic mt-2">Bientôt disponible</p>
                )}
              </Link>
            ))}
          </div>

          {/* Oumra Ramadan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div className="reveal-left">
              <p className="section-label mb-3">LE MOIS BÉNI</p>
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900" style={{ fontFamily: "var(--font-playfair, serif)" }}>
                Oumra Ramadan 2027
              </h3>
              <p className="text-gray-600 mb-5">
                Vivez l&apos;expérience spirituelle la plus intense de votre vie — accomplir la Oumra pendant le mois sacré de Ramadan, avec un encadrement de qualité.
              </p>
              <ul className="space-y-2.5 mb-8">
                {UMRAH_RAMADAN_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-[#0f5132]" strokeWidth={2.5} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/offres#umrah-ramadan" className="btn-primary">
                Réserver <ArrowRight size={15} />
              </Link>
            </div>
            <div className="reveal-right rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl">
              <div className="w-full h-full bg-cover bg-center hover:scale-105 transition-transform duration-700" style={{ backgroundImage: "url('/images/oumra-ramadan.jpg')" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ HADJ 2027 ════════════════════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: "url('/images/tawaf.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#062b1a] via-[#0a3d26] to-[#0a3d26]" />
        {/* Decoration */}
        <div className="absolute top-12 right-12 w-64 h-64 rounded-full border border-white/5 animate-rotate-slow" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="reveal-left text-white">
              <span className="inline-flex items-center gap-2 text-orange-400 text-xs font-bold tracking-widest uppercase mb-4">
                <span className="w-6 h-0.5 bg-orange-400" /> INSCRIPTIONS OUVERTES
              </span>
              <h2 className="text-5xl md:text-7xl font-black mb-6 leading-none" style={{ fontFamily: "var(--font-playfair, serif)" }}>
                HADJ<br />
                <span className="text-orange-400">2027</span>
              </h2>
              <p className="text-white/70 mb-2 text-lg">
                Préparez le voyage de votre vie. Places limitées — les inscriptions se ferment rapidement chaque année.
              </p>
              <div className="grid grid-cols-2 gap-3 my-7">
                {HAJJ_FEATURES.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm text-white/80">
                    <Check size={14} className="mt-0.5 flex-shrink-0 text-orange-400" strokeWidth={2.5} />
                    {f}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/offres#hajj-2027" className="btn-gold hover:scale-105 transition-transform">
                  Inscriptions Hadj 2027 <ArrowRight size={15} />
                </Link>
                <Link href="/offres#hajj-2027"
                  className="px-6 py-2.5 rounded-full border-2 border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-colors">
                  En savoir plus
                </Link>
              </div>
            </div>
            <div className="reveal-right">
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl border border-white/10">
                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: "url('/images/tawaf.jpg')" }} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#062b1a]/70 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 glass rounded-xl p-4">
                  <p className="text-white font-bold text-sm mb-1">🕋 Hadj 2027</p>
                  <p className="text-white/70 text-xs">à partir de <span className="text-orange-400 font-bold">3 184 500 FCFA</span> / pers.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ MAKKAH & MÉDINE ══════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          {/* Makkah */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div className="reveal-left">
              <p className="section-label mb-2">LA VILLE SAINTE</p>
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-[#0f5132]" style={{ fontFamily: "var(--font-playfair, serif)" }}>
                Makkah Al‑Mukarrama
              </h2>
              <div className="w-16 h-1 bg-amber-600 rounded-full mb-5" />
              <p className="text-gray-600 leading-relaxed mb-4">
                Venez découvrir la terre sainte qu&apos;Allah a rendue sacrée. La prière dans ce sanctuaire équivaut à 100 000 prières ailleurs (excepté Médine).
              </p>
              <p className="text-gray-600 leading-relaxed">
                La Ka&apos;aba, la station d&apos;Ibrahim, Zamzam, Safa et Marwa — chaque lieu est chargé d&apos;une spiritualité incomparable.
              </p>
            </div>
            <div className="reveal-right rounded-3xl overflow-hidden aspect-[4/3] shadow-xl group">
              <div className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: "url('/images/kaaba.jpg')" }} />
            </div>
          </div>

          {/* Médine */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div className="reveal-left rounded-3xl overflow-hidden aspect-[4/3] shadow-xl group">
              <div className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-700" style={{ backgroundImage: "url('/images/medine2.jpg')" }} />
            </div>
            <div className="reveal-right">
              <p className="section-label mb-2">LA CITÉ DU PROPHÈTE ﷺ</p>
              <h2 className="text-4xl md:text-5xl font-black mb-4 text-gray-900" style={{ fontFamily: "var(--font-playfair, serif)" }}>
                Al‑Madina Al‑Munawwara
              </h2>
              <div className="w-16 h-1 bg-emerald-500 rounded-full mb-5" />
              <p className="text-gray-600 leading-relaxed">
                La mosquée du Prophète ﷺ, la Rawdha, le Baqi&apos;, la mosquée de Quba, les montagnes d&apos;Ouhoud — autant de lieux qui vous rapprocheront du Prophète bien-aimé et de l&apos;histoire de l&apos;Islam.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ POURQUOI NOUS ════════════════ */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <p className="section-label mb-3">NOS ENGAGEMENTS</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, serif)" }}>
              Pourquoi choisir Hajj et Oumra ZAM ?
            </h2>
            <p className="text-gray-500 text-sm mt-2">Plus de 25 ans d&apos;expérience dans le domaine</p>
          </div>
          <div className="reveal space-y-2">
            {WHY_CHOOSE.map((item, i) => (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <button
                  onClick={() => setWhyOpen(whyOpen === i ? -1 : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-50 text-[#0f5132] text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-[#0f5132] transition-colors">{item.title}</span>
                  </div>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${whyOpen === i ? "bg-[#0f5132] rotate-45" : "bg-gray-100"}`}>
                    <Plus size={14} className={whyOpen === i ? "text-white" : "text-gray-500"} />
                  </div>
                </button>
                {whyOpen === i && (
                  <div className="px-6 pb-5 pl-16 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3 animate-fade-up">
                    {item.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TÉMOIGNAGES ══════════════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <p className="section-label mb-3">ILS NOUS ONT FAIT CONFIANCE</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, serif)" }}>
              Ce que disent nos pèlerins
            </h2>
            {/* Google badge */}
            <div className="flex justify-center mt-5">
              <div className="inline-flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 shadow-sm">
                <span className="font-black text-emerald-600 text-base">G</span>
                <span className="font-bold text-gray-900">4,9</span>
                <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} className="text-orange-400 fill-orange-400" />)}</div>
                <span className="text-xs text-gray-400">+1000 avis</span>
              </div>
            </div>
          </div>

          <div className="reveal grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {visibleTestimonials.map((idx, pos) => (
              <TestimonialCard key={idx} t={TESTIMONIALS[idx]} active={pos === 1} />
            ))}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setTestimonialIdx(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === testimonialIdx ? "bg-[#0f5132] w-6" : "bg-gray-200"}`} />
            ))}
          </div>

          {/* Nav */}
          <div className="flex justify-center gap-3">
            <button onClick={() => setTestimonialIdx((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-emerald-500 hover:text-[#0f5132] transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length)}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:border-emerald-500 hover:text-[#0f5132] transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════ FAQ ══════════════════════════ */}
      <section id="faq" className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <p className="section-label mb-3">QUESTIONS FRÉQUENTES</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, serif)" }}>
              Vos questions, nos réponses
            </h2>
          </div>
          <div className="reveal space-y-3">
            {FAQ.map((item, i) => (
              <div key={item.q} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <button onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left group">
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-[#0f5132] transition-colors pr-4">{item.q}</span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${faqOpen === i ? "bg-[#0f5132] rotate-45" : "bg-gray-100"}`}>
                    <Plus size={14} className={faqOpen === i ? "text-white" : "text-gray-500"} />
                  </div>
                </button>
                {faqOpen === i && (
                  <div className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3 animate-fade-up">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA FINAL ════════════════════ */}
      <section className="relative py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a3d26] via-[#0f5132] to-[#062b1a] animate-gradient-shift" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #fbbf24 0%, transparent 50%), radial-gradient(circle at 80% 20%, #6ee7b7 0%, transparent 40%)" }} />
        {/* Decorative circles */}
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full border border-white/10 animate-rotate-slow" />
        <div className="absolute -top-8 right-20 w-40 h-40 rounded-full border border-white/10 animate-float" />

        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6">
            <Sparkles size={14} className="text-orange-400" />
            <span className="text-white/80 text-xs font-medium">Votre voyage spirituel commence ici</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white leading-tight" style={{ fontFamily: "var(--font-playfair, serif)" }}>
            Prêt à accomplir<br />votre pèlerinage ?
          </h2>
          <p className="text-white/60 mb-10 text-lg">Notre équipe est disponible 7j/7 pour répondre à toutes vos questions.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
              className="btn-gold hover:scale-105 transition-transform shadow-xl shadow-amber-900/30 text-base px-8 py-3.5">
              <IconWhatsApp size={18} /> WhatsApp
            </a>
            <Link href="/contact"
              className="px-8 py-3.5 rounded-full border-2 border-white/30 text-white font-semibold hover:bg-white hover:text-[#0f5132] transition-all hover:scale-105 text-sm">
              Formulaire de contact
            </Link>
            <a href="tel:+22796969070"
              className="px-8 py-3.5 rounded-full glass text-white font-semibold hover:bg-white/20 transition-all text-sm flex items-center gap-2">
              <Phone size={15} /> Appeler
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
