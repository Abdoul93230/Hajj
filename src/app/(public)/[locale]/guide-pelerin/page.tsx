"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BookOpen, Compass, ChevronRight, ArrowRight } from "lucide-react";
import IconWhatsApp from "@/components/ui/IconWhatsApp";

interface TocItem     { id: string; label: string }
interface Pilgrimage  { title: string; arabic: string; desc: string; badge: string }
interface Ritual      { step: number; title: string; content: string }
interface HajjDay     { day: string; title: string; content: string }
interface Dua         { id: string; category: string; title: string; arabic: string; phonetic: string; translation: string; highlight?: boolean }

export default function GuidePelerinPage() {
  const t = useTranslations("guide");

  const toc          = t.raw("toc")          as TocItem[];
  const pilgrimages  = t.raw("pilgrimages")  as Pilgrimage[];
  const oumraRituals = t.raw("oumraRituals") as Ritual[];
  const hajjDays     = t.raw("hajjDays")     as HajjDay[];
  const duas         = t.raw("duas")         as Dua[];
  const duaCategories  = t.raw("duaCategories")  as string[];
  const hajjSchedule   = t.raw("hajjSchedule")   as { label: string; value: string }[];

  const TOOLS = [
    { href: "/coran",               icon: <BookOpen size={22} />,                    title: t("toolCoranTitle"), desc: t("toolCoranDesc") },
    { href: "/qibla",               icon: <Compass size={22} />,                     title: t("toolQiblaTitle"), desc: t("toolQiblaDesc") },
    { href: "/guide-pelerin#duas",  icon: <span className="text-lg">🤲</span>,      title: t("toolDuasTitle"),  desc: t("toolDuasDesc") },
  ];

  const [activeSection, setActiveSection] = useState("intro");
  const [duaFilter, setDuaFilter]         = useState("");
  const [expandedDua, setExpandedDua]     = useState<string | null>(null);

  const currentFilter  = duaFilter || duaCategories[0];
  const filteredDuas   = currentFilter === duaCategories[0]
    ? duas
    : duas.filter((d) => d.category === currentFilter);

  /* locale-agnostic color: category index determines colour */
  const duaColorsByIdx: Record<number, string> = {
    1: "bg-gray-100 text-gray-600",
    2: "bg-purple-100 text-purple-700",
    3: "bg-emerald-100 text-emerald-700",
    4: "bg-emerald-100 text-[#0f5132]",
    5: "bg-amber-100 text-amber-700",
  };
  const getDuaColor = (category: string) => {
    const idx = duaCategories.indexOf(category);
    return duaColorsByIdx[idx] ?? "bg-gray-100 text-gray-600";
  };

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {/* HERO */}
      <section className="relative bg-[#06251a] py-20 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: "url('/images/mosque-interior.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06251a]/60 to-[#06251a]" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 text-white/50 text-xs mb-4">
            <Link href="/" className="hover:text-white transition-colors">{t("breadHome")}</Link>
            <ChevronRight size={12} />
            <span className="text-white/80">{t("title")}</span>
          </div>
          <p className="section-label text-amber-400 mb-3">{t("toolsLabel")}</p>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4" style={{ fontFamily: "var(--font-playfair, serif)" }}>
            {t("title")}
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">{t("subtitle")}</p>
        </div>
      </section>

      {/* TOOLS SHORTCUTS */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap gap-3">
            {TOOLS.map((tool) => (
              <Link key={tool.href} href={tool.href as "/coran" | "/qibla" | "/guide-pelerin"}
                className="flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
                <span className="text-[#0f5132] group-hover:scale-110 transition-transform">{tool.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{tool.title}</p>
                  <p className="text-xs text-gray-400">{tool.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">

            {/* SIDEBAR TOC */}
            <aside className="hidden lg:block">
              <div className="sticky top-[140px] bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-4">{t("tocTitle")}</p>
                <nav className="space-y-1">
                  {toc.map((item) => (
                    <button key={item.id} onClick={() => scrollTo(item.id)}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                        activeSection === item.id
                          ? "bg-[#0f5132] text-white font-semibold"
                          : "text-gray-600 hover:bg-gray-50 hover:text-[#0f5132]"
                      }`}>
                      <ChevronRight size={12} className={activeSection === item.id ? "text-white" : "text-gray-300"} />
                      {item.label}
                    </button>
                  ))}
                </nav>

                <div className="mt-6 bg-[#062b1a] rounded-xl p-4 text-white">
                  <p className="font-bold text-sm mb-1">{t("ctaSidebar")}</p>
                  <p className="text-white/60 text-xs mb-3">{t("ctaSidebarDesc")}</p>
                  <Link href="/offres"
                    className="flex items-center gap-1.5 text-amber-400 text-xs font-bold hover:text-amber-300 transition-colors">
                    {t("ctaSidebarLink")} <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </aside>

            {/* CONTENT */}
            <div className="space-y-10">

              {/* 1 — Intro */}
              <section id="intro" className="scroll-mt-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-sm font-black flex-shrink-0">1</div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t("introTitle")}</h2>
                </div>
                <p className="text-gray-600 leading-relaxed mb-6">{t("introDesc")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {pilgrimages.map((p, i) => (
                    <div key={p.title} className={`rounded-xl border p-4 ${
                      i !== 1 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                    }`}>
                      {p.badge && (
                        <span className="inline-block text-xs font-bold bg-[#0f5132] text-white px-2 py-0.5 rounded-full mb-2">{p.badge}</span>
                      )}
                      <p className="font-bold text-gray-900 text-sm">{p.title}</p>
                      <p className={`text-xs mb-2 font-arabic ${i !== 1 ? "text-[#0f5132]" : "text-amber-700"}`}>{p.arabic}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 2 — Oumra */}
              <section id="oumra" className="scroll-mt-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-sm font-black flex-shrink-0">2</div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t("oumraSectionTitle")}</h2>
                </div>
                <p className="text-gray-600 leading-relaxed mb-4">{t("oumraSectionDesc1")}</p>
                <p className="text-gray-600 leading-relaxed mb-4">
                  {t("oumraSectionDesc2")} <span className="text-gray-400 text-sm">{t("oumraSectionHadithSource")}</span>
                </p>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <p className="text-sm text-[#062b1a] font-semibold mb-2">{t("oumraActsTitle")}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(t.raw("oumraActs") as string[]).map((act, i) => (
                      <div key={act} className="bg-white rounded-lg p-3 text-center border border-emerald-100">
                        <div className="w-7 h-7 rounded-full bg-[#0f5132] text-white text-xs font-black flex items-center justify-center mx-auto mb-1.5">{i + 1}</div>
                        <p className="text-xs font-semibold text-gray-800">{act}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 3 — Rituels Oumra */}
              <section id="rites-oumra" className="scroll-mt-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-sm font-black flex-shrink-0">3</div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t("oumraRitualsTitle")}</h2>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
                  <div className="space-y-6">
                    {oumraRituals.map((r) => (
                      <div key={r.step} className="flex gap-5">
                        <div className="w-9 h-9 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-xs font-black flex-shrink-0 z-10 shadow-sm">
                          {r.step}
                        </div>
                        <div className="flex-1 pb-1">
                          <p className="font-bold text-gray-900 mb-1.5">{r.title}</p>
                          <p className="text-sm text-gray-600 leading-relaxed">{r.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 4 — Hadj */}
              <section id="hadj" className="scroll-mt-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">4</div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t("hajjSectionTitle")}</h2>
                </div>
                <p className="text-gray-600 leading-relaxed mb-4">{t("hajjSectionDesc1")}</p>
                <p className="text-gray-600 leading-relaxed mb-4">{t("hajjSectionDesc2")}</p>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 text-center">
                  <p className="text-amber-900 font-bold text-sm mb-1">{t("hajjVerseAr")}</p>
                  <p className="text-amber-700 text-xs italic">{t("hajjVerseTr")}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {hajjSchedule.map((d) => (
                    <div key={d.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                      <p className="text-xs text-gray-400 mb-0.5">{d.label}</p>
                      <p className="font-bold text-gray-900 text-sm">{d.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 5 — Rites Hadj */}
              <section id="rites-hadj" className="scroll-mt-28 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">5</div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t("hajjRitualsTitle")}</h2>
                </div>
                <div className="space-y-4">
                  {hajjDays.map((day, i) => (
                    <div key={day.day} className={`rounded-xl border overflow-hidden ${i < 4 ? "border-amber-100" : "border-gray-100"}`}>
                      <div className={`px-5 py-3 flex items-center gap-3 ${i < 4 ? "bg-amber-50" : "bg-gray-50"}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${i < 4 ? "bg-amber-600" : "bg-gray-500"}`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className={`text-xs font-bold tracking-wide ${i < 4 ? "text-amber-600" : "text-gray-500"}`}>{day.day}</p>
                          <p className="font-bold text-gray-900 text-sm">{day.title}</p>
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        <p className="text-sm text-gray-600 leading-relaxed">{day.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 6 — Du'as */}
              <section id="duas" className="scroll-mt-28">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-sm font-black flex-shrink-0">6</div>
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t("duasTitle")}</h2>
                  </div>
                  <p className="text-gray-500 text-sm mb-5 pl-12">{t("duasDesc")}</p>

                  {/* Category filters */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {duaCategories.map((cat) => (
                      <button key={cat} onClick={() => setDuaFilter(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          currentFilter === cat
                            ? "bg-[#0f5132] text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-[#0f5132]"
                        }`}>
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Dua list */}
                  <div className="space-y-3">
                    {filteredDuas.map((dua) => (
                      <div key={dua.id}
                        className={`rounded-xl border overflow-hidden transition-all ${
                          dua.highlight ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100"
                        }`}>
                        <button
                          onClick={() => setExpandedDua(expandedDua === dua.id ? null : dua.id)}
                          className="w-full flex items-center justify-between px-5 py-3.5 text-left group"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${getDuaColor(dua.category)}`}>
                              {dua.category}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 group-hover:text-[#0f5132] transition-colors truncate">
                              {dua.title}
                            </span>
                          </div>
                          <span className={`ml-3 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                            expandedDua === dua.id ? "bg-[#0f5132] text-white rotate-45" : "bg-gray-100 text-gray-500"
                          }`}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </span>
                        </button>

                        {expandedDua === dua.id && (
                          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                            {/* Arabic */}
                            <div className="bg-[#062b1a] rounded-xl p-4 text-right">
                              <p className="text-white text-lg leading-loose font-arabic" dir="rtl">
                                {dua.arabic}
                              </p>
                            </div>
                            {/* Phonetic */}
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                              <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">{t("phonetic")}</p>
                              <p className="text-sm text-amber-900 italic leading-relaxed">{dua.phonetic}</p>
                            </div>
                            {/* Translation */}
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t("translationLabel")}</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{dua.translation}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* 7 — Conclusion */}
              <section id="conclusion" className="scroll-mt-28 bg-[#062b1a] rounded-2xl p-6 md:p-8 text-white">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-black flex-shrink-0">7</div>
                  <h2 className="text-xl md:text-2xl font-bold">{t("conclusionTitle")}</h2>
                </div>
                <p className="text-white/80 leading-relaxed mb-4">{t("conclusionText1")}</p>
                <p className="text-white/80 leading-relaxed mb-6">{t("conclusionText2")}</p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/offres"
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all hover:scale-105">
                    {t("btnSeeOffers")} <ArrowRight size={14} />
                  </Link>
                  <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all">
                    <IconWhatsApp size={16} /> {t("btnContact")}
                  </a>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <section className="bg-white py-14 px-4 border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <p className="section-label mb-3">{t("bottomLabel")}</p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-playfair, serif)" }}>
            {t("bottomTitle")}
          </h2>
          <p className="text-gray-500 text-sm mb-7">{t("bottomDesc")}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/offres" className="btn-primary px-8 py-3 flex items-center gap-2">
              {t("btnOffers")} <ArrowRight size={14} />
            </Link>
            <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 border-2 border-[#0f5132] text-[#0f5132] font-semibold text-sm px-6 py-3 rounded-full hover:bg-emerald-50 transition-all">
              <IconWhatsApp size={16} /> WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
