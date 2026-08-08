"use client";

import { useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import Image from "next/image";
import { Menu, X, ShoppingCart, Globe, ChevronDown } from "lucide-react";
import UserMenu from "./UserMenu";

const locales = ["fr", "en", "ar"] as const;
const localeNames: Record<string, string> = { fr: "FR", en: "EN", ar: "AR" };

type NavItem = {
  label: string;
  href: string;
  mega?: {
    categoryLabel: string;
    leftImage: string;
    leftTitle: string;
    leftSubtitle: string;
    rightImage: string;
    links: { label: string; href: string }[];
  };
};

const NAV: NavItem[] = [
  { label: "Accueil", href: "/" },
  {
    label: "Qui sommes-nous",
    href: "/a-propos",
    mega: {
      categoryLabel: "DÉCOUVRIR",
      leftImage: "/images/men-ihram.jpg",
      leftTitle: "Qui sommes-nous",
      leftSubtitle: "Une agence dédiée à votre pèlerinage, du début à la fin.",
      rightImage: "/images/560922223_122098605927071313_4417420479539281621_n.jpg",
      links: [
        { label: "Notre histoire", href: "/notre-histoire" },
        { label: "Notre équipe", href: "/a-propos" },
        { label: "Galerie", href: "/notre-histoire#galerie" },
        { label: "Témoignages", href: "/avis" },
        { label: "FAQ", href: "/#faq" },
        { label: "Contactez-nous", href: "/contact" },
      ],
    },
  },
  {
    label: "Hadj et Oumra",
    href: "/offres",
    mega: {
      categoryLabel: "LE PÈLERINAGE",
      leftImage: "/images/kaaba.jpg",
      leftTitle: "Hadj et Oumra",
      leftSubtitle: "Accomplissez votre pèlerinage en toute sérénité.",
      rightImage: "/images/tawaf.jpg",
      links: [
        { label: "Oumra Août 2026", href: "/offres#umrah-2026" },
        { label: "Oumra Ramadan 2027", href: "/offres#umrah-ramadan" },
        { label: "Hadj 2027", href: "/offres#hajj-2027" },
        { label: "Toutes les offres", href: "/offres" },
      ],
    },
  },
  {
    label: "Outils du pèlerin",
    href: "/guide-pelerin",
    mega: {
      categoryLabel: "OUTILS",
      leftImage: "/images/quran.jpg",
      leftTitle: "Outils du pèlerin",
      leftSubtitle: "Tout pour vous préparer, à portée de main.",
      rightImage: "/images/mosque-dome.jpg",
      links: [
        { label: "Guide du pèlerin", href: "/guide-pelerin" },
        { label: "Le Coran", href: "/coran" },
        { label: "Direction Qibla", href: "/qibla" },
        { label: "Invocations / Du'as", href: "/guide-pelerin#duas" },
      ],
    },
  },
  { label: "Boutique", href: "/boutique" },
  { label: "Billetterie", href: "/billetterie" },
];

function MegaDropdown({ item }: { item: NavItem }) {
  const { mega } = item;
  if (!mega) return null;
  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-xl rounded-xl mt-1 z-50 overflow-hidden"
      style={{ width: 640 }}>
      <div className="grid grid-cols-[200px_1fr_200px] gap-0">
        {/* Left image card */}
        <div className="relative h-full min-h-[180px] overflow-hidden rounded-tl-xl rounded-bl-xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${mega.leftImage}')` }}
          />
          <div className="absolute inset-0 bg-[#0f5132]/70" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-white font-bold text-sm leading-tight">{mega.leftTitle}</p>
            <p className="text-emerald-200 text-xs mt-1 leading-snug">{mega.leftSubtitle}</p>
          </div>
        </div>

        {/* Center links */}
        <div className="px-6 py-5">
          <p className="text-xs font-bold tracking-widest text-amber-600 mb-3 uppercase">
            {mega.categoryLabel}
          </p>
          <ul className="space-y-1">
            {mega.links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block text-sm text-gray-700 hover:text-[#0f5132] py-1 transition-colors hover:translate-x-1 transform duration-150"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Right image */}
        <div className="relative min-h-[180px] overflow-hidden rounded-tr-xl rounded-br-xl">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${mega.rightImage}')` }}
          />
          <div className="absolute inset-0 bg-[#0f5132]/20" />
        </div>
      </div>
    </div>
  );
}

export default function Header({ user }: { user: { name: string; role: string } | null }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  return (
    <div className="sticky top-0 z-50">
      {/* Announcement bar */}
      <div className="bg-[#0f5132] text-white text-xs py-2 px-4 flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-300 inline-block animate-pulse" />
          Hajj et Oumra ZAM — Fidèle à ses engagements
        </span>
        <span className="hidden sm:block">Les inscriptions ont commencé pour le Hadj et Oumra 2027 !</span>
      </div>

      {/* Main header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <Image
                src="/images/logo-zam.png"
                alt="Hajj et Oumra ZAM"
                width={52}
                height={52}
                className="object-contain"
              />
              <div className="flex flex-col leading-none">
                <span
                  className="font-bold text-xl tracking-tight text-[#0f5132]"
                  style={{ fontFamily: "var(--font-playfair, serif)" }}
                >
                  Hajj et Oumra ZAM
                </span>
                <span className="text-xs tracking-widest text-amber-700 font-semibold">
                  HADJ & OUMRA
                </span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0 relative">
              {NAV.map((item) => (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => item.mega && setOpenDropdown(item.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <Link
                    href={item.href}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded ${
                      openDropdown === item.label
                        ? "text-[#0f5132]"
                        : "text-gray-700 hover:text-[#0f5132]"
                    }`}
                  >
                    {item.label}
                    {item.mega && (
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 ${openDropdown === item.label ? "rotate-180" : ""}`}
                      />
                    )}
                  </Link>
                  {item.mega && openDropdown === item.label && (
                    <MegaDropdown item={item} />
                  )}
                </div>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Link href="/boutique" className="p-2 text-gray-500 hover:text-[#0f5132]">
                <ShoppingCart size={18} />
              </Link>

              {/* Language switcher */}
              <div className="relative">
                <button
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-[#0f5132] px-2 py-1"
                >
                  <Globe size={15} />
                  {localeNames[locale]}
                  <ChevronDown size={12} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 mt-1 bg-white border border-gray-100 rounded-lg shadow-lg py-1 min-w-[70px] z-50">
                    {locales.map((l) => (
                      <button
                        key={l}
                        onClick={() => { router.push(pathname, { locale: l }); setLangOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-emerald-50 hover:text-[#0f5132] ${
                          l === locale ? "font-bold text-[#0f5132]" : "text-gray-700"
                        }`}
                      >
                        {localeNames[l]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Espace pèlerin / user */}
              <UserMenu user={user} />

              {/* Mobile toggle */}
              <button
                className="lg:hidden p-2 text-gray-700"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="lg:hidden border-t border-gray-100 py-3">
              {NAV.map((item) => (
                <div key={item.href}>
                  {item.mega ? (
                    <>
                      <button
                        onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#0f5132] hover:bg-emerald-50 rounded"
                      >
                        {item.label}
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${mobileExpanded === item.label ? "rotate-180" : ""}`}
                        />
                      </button>
                      {mobileExpanded === item.label && (
                        <div className="pl-4 pb-1">
                          {item.mega.links.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setMobileOpen(false)}
                              className="block px-3 py-1.5 text-sm text-gray-600 hover:text-[#0f5132]"
                            >
                              {link.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#0f5132] hover:bg-emerald-50 rounded"
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
              <Link
                href="/compte"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#0f5132] hover:bg-emerald-50 rounded"
              >
                Espace pèlerin
              </Link>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
