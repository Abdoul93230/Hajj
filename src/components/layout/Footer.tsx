"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { MapPin, Phone, Mail, Clock, ArrowRight, CheckCircle } from "lucide-react";
import Image from "next/image";
import IconWhatsApp from "@/components/ui/IconWhatsApp";

function IconFacebook({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}


function IconTikTok({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.2 8.2 0 0 0 4.79 1.52V6.82a4.85 4.85 0 0 1-1.03-.13z" />
    </svg>
  );
}

const SOCIAL = [
  { label: "Facebook",  href: "https://www.facebook.com/profile.php?id=61582139390008", icon: <IconFacebook size={16} />,  hover: "hover:bg-[#1877f2] hover:border-[#1877f2]" },
  { label: "WhatsApp",  href: "https://wa.me/22796969070",                              icon: <IconWhatsApp size={16} />,  hover: "hover:bg-[#25d366] hover:border-[#25d366]" },
  { label: "TikTok",    href: "https://www.tiktok.com/@hajjoumra.zam",              icon: <IconTikTok size={15} />,    hover: "hover:bg-black hover:border-black" },
];

const NAV_LINKS = [
  { label: "Accueil",          href: "/" },
  { label: "Qui sommes-nous",  href: "/a-propos" },
  { label: "Hadj et Oumra",    href: "/offres" },
  { label: "Guide du pèlerin", href: "/guide-pelerin" },
  { label: "Avis clients",     href: "/avis" },
  { label: "Boutique",         href: "/boutique" },
  { label: "Contact",          href: "/contact" },
];

const OFFERS = [
  { label: "Oumra Août 2026",      href: "/offres#umrah-2026",   badge: "Disponible" },
  { label: "Oumra Ramadan 2027",   href: "/offres#umrah-ramadan", badge: null },
  { label: "Hadj 2027",            href: "/offres#hajj-2027",    badge: "Inscriptions" },
  { label: "Toutes les offres",    href: "/offres",               badge: null },
];

const LEGAL = [
  { label: "CGV",                  href: "/cgv" },
  { label: "Mentions légales",     href: "/mentions-legales" },
  { label: "Politique cookies",    href: "/politique-cookies" },
  { label: "Gérer les cookies",    href: "/cookies" },
];

const ACCREDITATIONS = [
  { src: "/images/IATA.webp",      alt: "IATA",              w: 64, h: 32 },
  { src: "/images/coho.webp",      alt: "COHO",              w: 64, h: 32 },
  { src: "/images/min-hadjj.webp", alt: "Ministère du Hadj", w: 64, h: 32 },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="bg-[#062b1a] text-white">

      {/* ── CTA NEWSLETTER BAND ────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(30,58,95,0.35) 0%, transparent 70%)" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left — pitch */}
            <div>
              <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-3">Newsletter</p>
              <h3 className="text-2xl md:text-3xl font-bold mb-3 leading-snug">
                Soyez les premiers informés<br />de nos prochains départs
              </h3>
              <p className="text-white/50 text-sm mb-6 max-w-md">
                Offres exclusives, dates de départ Hadj &amp; Oumra, conseils pratiques — directement dans votre boîte mail.
              </p>
              {/* Trust bullets */}
              <div className="flex flex-wrap gap-4 text-xs text-white/60">
                {["Aucun spam", "Désinscription facile", "Offres exclusives"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle size={12} className="text-emerald-400" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — form + social */}
            <div>
              {subscribed ? (
                <div className="flex items-center gap-3 bg-emerald-700/30 border border-emerald-600/40 rounded-2xl px-6 py-5">
                  <CheckCircle size={22} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Inscription confirmée !</p>
                    <p className="text-white/50 text-sm">Vous recevrez nos prochaines offres par e-mail.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }}
                  className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-sm">
                  <div className="relative flex-1">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      required type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full pl-9 pr-3 py-3 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                    />
                  </div>
                  <button type="submit"
                    className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-all hover:scale-105 flex-shrink-0">
                    S&apos;inscrire <ArrowRight size={14} />
                  </button>
                </form>
              )}

              {/* Social row */}
              <div className="flex items-center gap-4 mt-6">
                <span className="text-xs text-white/40 font-medium">Suivez-nous</span>
                <div className="flex gap-2">
                  {SOCIAL.map((s) => (
                    <a key={s.label} href={s.href}
                      target={s.href.startsWith("http") ? "_blank" : undefined}
                      rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      aria-label={s.label}
                      className={`w-9 h-9 rounded-xl border border-white/15 flex items-center justify-center text-white/60 hover:text-white transition-all ${s.hover}`}>
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── MAIN GRID ──────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12">

          {/* Brand col */}
          <div>
            {/* Logo + name */}
            <div className="flex items-center gap-3 mb-5">
              <Image src="/images/logo-zam.png" alt="Hajj et Oumra ZAM" width={48} height={48} className="object-contain" />
              <div>
                <p className="font-bold text-xl leading-none" style={{ fontFamily: "var(--font-playfair, serif)" }}>Hajj et Oumra ZAM</p>
                <p className="text-xs tracking-widest text-amber-400 font-semibold mt-0.5">HADJ & OUMRA</p>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-6">
              Agence spécialisée dans l&apos;organisation de forfaits Hadj et Oumra adaptés aux besoins des pèlerins. Hajj et Oumra ZAM, c&apos;est la confiance.
            </p>

            {/* Contact list */}
            <ul className="space-y-2.5 text-sm">
              {[
                { icon: <MapPin size={13} />,  text: "Quartier Kalley-Est, BP 919, Niamey, Niger" },
                { icon: <Phone size={13} />,   text: "+227 96 96 39 61 · +227 96 87 27 87" },
                { icon: <Mail size={13} />,    text: "contact@hajjoumrazam.com" },
                { icon: <Clock size={13} />,   text: "Lun – Sam, 8h – 18h" },
              ].map(({ icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-white/50">
                  <span className="text-amber-400 mt-0.5 flex-shrink-0">{icon}</span>
                  {text}
                </li>
              ))}
            </ul>

            {/* Accréditations */}
            <div className="mt-7">
              <p className="text-xs font-bold tracking-widest text-white/30 uppercase mb-3">Accréditations</p>
              <div className="flex gap-3 flex-wrap items-center">
                {ACCREDITATIONS.map(({ src, alt, w, h }) => (
                  <div key={alt}
                    className="bg-white rounded-lg px-3 py-2 flex items-center justify-center hover:shadow-lg hover:shadow-emerald-900/40 transition-all">
                    <Image src={src} alt={alt} width={w} height={h} className="object-contain max-h-8 w-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-5">Navigation</p>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}
                    className="group flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                    <span className="w-0 group-hover:w-3 h-px bg-amber-400 transition-all duration-200 flex-shrink-0" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Nos offres */}
          <div>
            <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-5">Nos offres</p>
            <ul className="space-y-2.5">
              {OFFERS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}
                    className="group flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                    <span className="w-0 group-hover:w-3 h-px bg-amber-400 transition-all duration-200 flex-shrink-0" />
                    <span className="flex items-center gap-2">
                      {l.label}
                      {l.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-700/60 text-emerald-300 leading-none">
                          {l.badge}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-5">Légal</p>
            <ul className="space-y-2.5">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}
                    className="group flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                    <span className="w-0 group-hover:w-3 h-px bg-amber-400 transition-all duration-200 flex-shrink-0" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── BOTTOM BAR ─────────────────────────────── */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">© 2026 Hajj et Oumra ZAM — Tous droits réservés</p>
          <div className="flex items-center gap-5">
            {(["fr", "en", "ar"] as const).map((l) => (
              <Link key={l} href="/" locale={l}
                className="text-xs font-semibold text-white/30 hover:text-white transition-colors uppercase tracking-widest">
                {l}
              </Link>
            ))}
          </div>
          <p className="text-xs text-white/20">Niamey, Niger 🇳🇪</p>
        </div>
      </div>

    </footer>
  );
}
