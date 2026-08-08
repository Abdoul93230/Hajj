"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Shield, Heart, Star, Users, ArrowRight, MapPin, Quote, ChevronLeft, ChevronRight } from "lucide-react";

/* ── Reveal on scroll ── */
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

/* ── Animated counter ── */
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

const TEAM = [
  {
    name: "El Hadj Moussa Abdou",
    role: "Fondateur & Président",
    tag: "Le visionnaire",
    bio: "Né à Niamey dans une famille profondément attachée aux valeurs islamiques, El Hadj Moussa Abdou accompagne ses premiers pèlerins en 1998. Ce voyage est une révélation : il y voit une mission de vie. Pendant vingt ans, il bâtit patiemment une réputation de sérieux, de probité et d'amour sincère pour les pèlerins.",
    bio2: "Sous sa direction, Hajj et Oumra ZAM obtient en 2018 son agrément officiel du COHO et s'impose comme une référence incontournable pour les pèlerins du Niger et d'Afrique de l'Ouest.",
    image: "/images/kaaba.jpg",
  },
  {
    name: "Ibrahima Moussa",
    role: "Directeur Général",
    tag: "L'héritier",
    bio: "Fils du fondateur, Ibrahima a grandi au contact des pèlerins. Il accompagne son père dès l'adolescence, apprend la rigueur opérationnelle et la bienveillance humaine qui font la marque de Hajj et Oumra ZAM.",
    bio2: "Diplômé en gestion hôtelière et passionné par l'amélioration continue, il prend la direction générale de l'agence en 2020 avec pour mission de moderniser les services tout en préservant l'âme fondatrice.",
    image: "/images/medine.jpg",
  },
  {
    name: "Fatouma Adamou",
    role: "Responsable Oumra & Hadj",
    tag: "L'experte terrain",
    bio: "Fatouma a effectué plus de quinze voyages en Arabie Saoudite en tant qu'encadreur. Elle connaît les hôtels, les circuits, les imprévus et les solutions. Sa présence rassure les pèlerins, en particulier les personnes âgées et les primo-pèlerins.",
    bio2: "Elle supervise la conception des programmes, la sélection des hôtels et la formation des guides locaux — garantissant que chaque séjour tient ses promesses.",
    image: "/images/kaaba.jpg",
  },
  {
    name: "Youssouf Hamidou",
    role: "Responsable Logistique & Billets",
    tag: "Le gestionnaire",
    bio: "Affilié IATA depuis 2019, Youssouf maîtrise les rouages de la billetterie aérienne et de la logistique de groupe. Il négocie les meilleures liaisons Niamey – Djeddah et coordonne les transferts sur place.",
    bio2: "Méthodique et intègre, il veille à ce qu'aucun dossier ne soit incomplet le jour du départ — une exigence qu'il s'est fixée personnellement depuis son premier Hadj.",
    image: "/images/medine.jpg",
  },
];

const VALUES = [
  {
    icon: <Shield size={24} />,
    title: "Confiance",
    desc: "Transparence totale sur les prix, les prestations et le déroulé du voyage. Aucune mauvaise surprise.",
  },
  {
    icon: <Heart size={24} />,
    title: "Bienveillance",
    desc: "Un accompagnement humain, attentif aux personnes âgées et aux premiers départs. Personne n'est laissé seul.",
  },
  {
    icon: <Star size={24} />,
    title: "Excellence",
    desc: "Des prestations soigneusement sélectionnées, dignes de la sacralité du pèlerinage vers les Lieux Saints.",
  },
  {
    icon: <Users size={24} />,
    title: "Proximité",
    desc: "Une équipe locale, joignable et présente avant, pendant et après le voyage. Toujours à votre écoute.",
  },
];

const TIMELINE = [
  { year: "1998", title: "La vocation", desc: "El Hadj Moussa Abdou accompagne ses premiers pèlerins vers La Mecque. Une mission de vie commence." },
  { year: "2005", title: "Les premières caravanes", desc: "Structuration des premiers groupes Hadj et Oumra. L'agence noue ses premiers partenariats hôteliers à Makkah et Médine." },
  { year: "2010", title: "Expansion régionale", desc: "Hajj et Oumra ZAM devient une référence pour les pèlerins du Niger, du Burkina Faso et du Mali." },
  { year: "2018", title: "Agrément officiel COHO", desc: "Obtention de l'agrément n° NE-2018-0421. Un cap décisif qui confirme le sérieux et la légitimité de l'agence." },
  { year: "2022", title: "1 000 pèlerins accompagnés", desc: "Franchissement du cap symbolique des 1 000 pèlerins. Chaque retour est une fierté et un engagement renouvelé." },
  { year: "2024", title: "Plateforme numérique", desc: "Lancement du portail digital Hajj et Oumra ZAM pour réserver, suivre son dossier et préparer son pèlerinage depuis Niamey." },
];

const GALLERY = [
  "/images/kaaba.jpg",
  "/images/medine.jpg",
  "/images/kaaba.jpg",
  "/images/medine.jpg",
  "/images/kaaba.jpg",
  "/images/medine.jpg",
];

const STATS = [
  { value: 25, suffix: "+", label: "Années d'expérience" },
  { value: 1200, suffix: "+", label: "Pèlerins accompagnés" },
  { value: 98, suffix: "%", label: "Taux de satisfaction" },
  { value: 3, suffix: "", label: "Pays desservis" },
];

function StatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCounter(value);
  return (
    <div className="text-center">
      <p className="text-4xl md:text-5xl font-black text-white mb-1">
        <span ref={ref}>{count}</span>{suffix}
      </p>
      <p className="text-emerald-200 text-sm font-medium">{label}</p>
    </div>
  );
}

export default function NotreHistoirePage() {
  useReveal();
  const [galleryIdx, setGalleryIdx] = useState(0);

  return (
    <div className="bg-white">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative bg-[#06251a] min-h-[440px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/images/kaaba.jpg" alt="La Kaaba" fill className="object-cover opacity-20" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06251a] via-[#06251a]/90 to-[#06251a]/50" />
        </div>
        <div className="absolute right-10 top-10 w-72 h-72 rounded-full border border-white/5 hidden lg:block" />
        <div className="absolute right-24 top-24 w-48 h-48 rounded-full border border-white/5 hidden lg:block" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <nav className="flex items-center gap-2 text-xs text-white/40 mb-8">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <span>/</span>
            <span className="text-white/70">Notre Histoire</span>
          </nav>
          <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">À PROPOS D'ALDIYAFA</p>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-5 leading-tight"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            Les hommes derrière<br />Hajj et Oumra ZAM
          </h1>
          <p className="text-white/60 text-lg max-w-xl leading-relaxed">
            Les personnes qui portent Hajj et Oumra ZAM, au service des pèlerins depuis 1998 — de Niamey jusqu&apos;aux Lieux Saints.
          </p>
          <div className="flex items-center gap-2 mt-6 text-white/50 text-sm">
            <MapPin size={14} className="text-amber-400" />
            Niamey, Niger — Quartier Kalley-Est, BP 919
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────── */}
      <section className="bg-[#0a3d26]">
        <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map(s => <StatItem key={s.label} value={s.value} suffix={s.suffix} label={s.label} />)}
        </div>
      </section>

      {/* ── ÉQUIPE ────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14 reveal">
          <p className="text-xs font-bold tracking-widest text-amber-600 uppercase mb-3">NOTRE ÉQUIPE</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            Des visages derrière chaque départ
          </h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            Une équipe unie par la même vocation : vous accompagner vers les Lieux Saints avec foi, rigueur et humanité.
          </p>
        </div>

        <div className="space-y-16">
          {TEAM.map((member, i) => (
            <div key={i} className={`reveal grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? "lg:[direction:rtl]" : ""}`}>
              {/* Image */}
              <div className="[direction:ltr]">
                <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-xl">
                  <Image src={member.image} alt={member.name} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06251a]/70 to-transparent" />
                  <div className="absolute bottom-5 left-5">
                    <span className="inline-block bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                      {member.tag}
                    </span>
                  </div>
                </div>
              </div>

              {/* Text */}
              <div className="[direction:ltr] space-y-4">
                <div>
                  <p className="text-xs font-bold tracking-widest text-[#0f5132] uppercase mb-1">{member.role}</p>
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
      <section className="bg-[#062b1a] py-16 px-4">
        <div className="max-w-3xl mx-auto text-center reveal">
          <Quote size={36} className="text-[#0f5132] mx-auto mb-6" />
          <blockquote className="text-2xl md:text-3xl font-bold text-white leading-snug mb-6"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            &laquo;&nbsp;Accompagner un pèlerin vers la Maison de Dieu est une responsabilité sacrée.
            Nous la portons avec foi et humilité.&nbsp;&raquo;
          </blockquote>
          <p className="text-emerald-300 font-semibold">— El Hadj Moussa Abdou, Fondateur de Hajj et Oumra ZAM</p>
        </div>
      </section>

      {/* ── VALEURS ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14 reveal">
          <p className="text-xs font-bold tracking-widest text-amber-600 uppercase mb-3">CE QUI NOUS GUIDE</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            Nos valeurs fondamentales
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map((v, i) => (
            <div key={i} className="reveal group bg-white border border-gray-100 rounded-2xl p-6 hover:border-emerald-200 hover:shadow-md transition-all text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#0f5132] mb-4 mx-auto group-hover:bg-[#0f5132] group-hover:text-white transition-all">
                {v.icon}
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
            <p className="text-xs font-bold tracking-widest text-amber-600 uppercase mb-3">CHRONOLOGIE</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900"
              style={{ fontFamily: "var(--font-playfair, serif)" }}>
              Les grandes étapes
            </h2>
          </div>

          {/* Desktop alternating */}
          <div className="hidden md:block relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-emerald-200 -translate-x-1/2" />
            <div className="space-y-10">
              {TIMELINE.map((item, i) => {
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
                      <div className="w-5 h-5 rounded-full bg-[#0f5132] border-4 border-white shadow-md ring-2 ring-emerald-200 z-10" />
                      <span className="text-xs font-black text-[#0f5132] bg-white border border-emerald-100 shadow-sm px-3 py-1 rounded-full">
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
            <div className="absolute left-5 top-0 bottom-0 w-px bg-emerald-200" />
            <div className="space-y-7">
              {TIMELINE.map((item, i) => (
                <div key={i} className="reveal relative flex gap-5 pl-12">
                  <div className="absolute left-3.5 top-1.5 w-4 h-4 rounded-full bg-[#0f5132] border-4 border-white shadow ring-2 ring-emerald-200 z-10" />
                  <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <span className="inline-block text-xs font-black text-[#0f5132] bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full mb-2">
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
          <p className="text-xs font-bold tracking-widest text-amber-600 uppercase mb-3">EN IMAGES</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            Moments de pèlerinage
          </h2>
        </div>

        {/* Main image */}
        <div className="reveal relative rounded-3xl overflow-hidden aspect-video shadow-xl mb-4">
          <Image src={GALLERY[galleryIdx]} alt="Pèlerinage" fill className="object-cover transition-all duration-500" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06251a]/40 to-transparent" />
          {/* Nav arrows */}
          <button onClick={() => setGalleryIdx(i => (i - 1 + GALLERY.length) % GALLERY.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-all">
            <ChevronLeft size={18} className="text-gray-800" />
          </button>
          <button onClick={() => setGalleryIdx(i => (i + 1) % GALLERY.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow transition-all">
            <ChevronRight size={18} className="text-gray-800" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {GALLERY.map((_, i) => (
              <button key={i} onClick={() => setGalleryIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === galleryIdx ? "bg-white w-6" : "bg-white/50"}`} />
            ))}
          </div>
        </div>

        {/* Thumbnails */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {GALLERY.map((src, i) => (
            <button key={i} onClick={() => setGalleryIdx(i)}
              className={`relative rounded-xl overflow-hidden aspect-square transition-all ${i === galleryIdx ? "ring-2 ring-[#0f5132] opacity-100" : "opacity-60 hover:opacity-90"}`}>
              <Image src={src} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      </section>

      {/* ── ACCRÉDITATIONS ────────────────────────────────── */}
      <section className="bg-gray-50 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center reveal">
          <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-8">NOS ACCRÉDITATIONS</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { src: "/images/IATA.webp",      alt: "IATA" },
              { src: "/images/coho.webp",      alt: "COHO" },
              { src: "/images/min-hadjj.webp", alt: "Ministère du Hadj" },
            ].map(({ src, alt }) => (
              <div key={alt} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-5 hover:shadow-md transition-shadow">
                <Image src={src} alt={alt} width={90} height={45} className="object-contain max-h-10 w-auto" />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-5">
            Agréée COHO n° NE-2018-0421 · Affiliée IATA · Reconnue par le Ministère saoudien du Hadj
          </p>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────── */}
      <section className="relative bg-[#062b1a] py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: "url('/images/kaaba.jpg')" }} />
        <div className="relative z-10 max-w-3xl mx-auto text-center reveal">
          <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-4">REJOIGNEZ NOTRE FAMILLE</p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-5"
            style={{ fontFamily: "var(--font-playfair, serif)" }}>
            Vivez à votre tour<br />ce voyage d&apos;exception
          </h2>
          <p className="text-white/60 mb-8 text-base max-w-xl mx-auto">
            Rejoignez les nombreuses familles qui nous ont fait confiance pour leur Hadj et leur Oumra.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/offres"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold px-8 py-3.5 rounded-full transition-all hover:scale-105 shadow-lg">
              Voir les offres <ArrowRight size={16} />
            </Link>
            <Link href="/contact"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-3.5 rounded-full border border-white/20 transition-all">
              Nous contacter
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
