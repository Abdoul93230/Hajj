"use client";

import { useState, use } from "react";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight, Check, X, MapPin, Plane, Calendar, Clock,
  Star, Phone, ChevronRight, Users,
} from "lucide-react";
import { OFFERS, getOfferBySlug } from "@/lib/offers-data";
import IconWhatsApp from "@/components/ui/IconWhatsApp";

/* ── Testimonials (shared) ─────────────────────── */
const TESTIMONIALS = [
  { initial: "A", name: "Aminata D.", location: "Niamey",   rating: 5, text: "Service exceptionnel, équipe très professionnelle. J'ai pu accomplir mon Oumra en toute sérénité. Je recommande vivement cette agence !" },
  { initial: "I", name: "Ibrahim K.", location: "Maradi",   rating: 5, text: "Mon Hadj a été une expérience spirituelle parfaite. L'accompagnement du début à la fin était irréprochable. Qu'Allah vous récompense." },
  { initial: "F", name: "Fatoumata S.", location: "Tahoua", rating: 5, text: "Très bien organisé. Les hôtels étaient proches du Haram, les guides très compétents. Je repars l'année prochaine avec eux." },
  { initial: "O", name: "Oumarou H.", location: "Zinder",   rating: 5, text: "Prix transparents, aucun frais caché. L'équipe est disponible à tout moment. Première Oumra inoubliable !" },
];

/* ── Tab IDs ───────────────────────────────────── */
type Tab = "sejour" | "hotels" | "vols" | "tarifs" | "programme" | "documents";
const TABS: { id: Tab; label: string }[] = [
  { id: "sejour",     label: "Le séjour" },
  { id: "hotels",     label: "Hôtels" },
  { id: "vols",       label: "Vols" },
  { id: "tarifs",     label: "Tarifs" },
  { id: "programme",  label: "Programme" },
  { id: "documents",  label: "Documents" },
];

/* ── Page ──────────────────────────────────────── */
export default function OfferDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const offer = getOfferBySlug(slug);
  if (!offer) notFound();

  const [activeTab, setActiveTab] = useState<Tab>("sejour");

  const accentClass =
    offer.badgeColor === "amber"  ? "bg-amber-700"  :
    offer.badgeColor === "purple" ? "bg-purple-800" :
    "bg-[#0f5132]";

  const accentText =
    offer.badgeColor === "amber"  ? "text-amber-600"  :
    offer.badgeColor === "purple" ? "text-purple-700" :
    "text-[#0f5132]";

  const btnClass =
    offer.badgeColor === "amber"  ? "bg-amber-600 hover:bg-amber-500"   :
    offer.badgeColor === "purple" ? "bg-purple-700 hover:bg-purple-600" :
    "bg-[#0f5132] hover:bg-[#157347]";

  return (
    <>
      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative min-h-[60vh] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${offer.heroImage}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-white/50 text-xs mb-4">
            <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
            <ChevronRight size={12} />
            <Link href="/offres" className="hover:text-white transition-colors">Nos offres</Link>
            <ChevronRight size={12} />
            <span className="text-white/80">{offer.title}</span>
          </div>
          <span className="inline-block text-xs font-bold bg-white/20 text-white px-3 py-1 rounded-full mb-3">{offer.subtitle}</span>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4" style={{ fontFamily: "var(--font-playfair, serif)" }}>
            {offer.title}
          </h1>
          {/* Quick info pills */}
          <div className="flex flex-wrap gap-3">
            {offer.highlights.map((h) => (
              <div key={h.label} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white text-xs font-medium">
                <span>{h.icon}</span>
                <span className="text-white/60">{h.label} :</span>
                <span>{h.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STICKY PRICE BAR ─────────────────────── */}
      <div className="sticky top-[72px] z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-gray-400">à partir de</span>
            <span className={`text-2xl font-black ${accentText}`}>{offer.priceFrom.toLocaleString("fr-FR")} {offer.priceCurrency}</span>
            <span className="text-xs text-gray-400">/ pers.</span>
          </div>
          <div className="flex gap-2">
            <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 border-2 border-[#0f5132] text-[#0f5132] text-sm font-semibold px-4 py-2 rounded-full hover:bg-emerald-50 transition-all">
              <IconWhatsApp size={16} /> WhatsApp
            </a>
            <a href="tel:+22796969070"
              className={`flex items-center gap-2 ${btnClass} text-white text-sm font-bold px-5 py-2 rounded-full transition-all`}>
              Réserver <ArrowRight size={13} />
            </a>
          </div>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 px-5 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? `border-[#0f5132] ${accentText}`
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────── */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

            {/* Left column — tab content */}
            <div>

              {/* ─ SÉJOUR ─ */}
              {activeTab === "sejour" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Votre séjour spirituel</h2>
                    <p className="text-gray-600 leading-relaxed mb-6">
                      Hajj et Oumra ZAM vous propose un voyage tout compris au départ de Niamey, avec un encadrement religieux continu par une équipe expérimentée. Logement de qualité à proximité des deux mosquées sacrées, visites guidées et préparation aux rites : tout est pensé pour un pèlerinage serein et complet.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { icon: "🏨", title: "Confort", desc: "Hébergement de qualité à Médine et à Makkah, sélectionnés pour leur proximité et leurs prestations." },
                        { icon: "📍", title: "Proximité", desc: "Hôtels à quelques pas des deux mosquées sacrées pour un accès facilité aux rites." },
                        { icon: "🤝", title: "Accompagnement", desc: "Encadrement continu par une équipe expérimentée, guides religieux à chaque étape." },
                      ].map((f) => (
                        <div key={f.title} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="text-2xl mb-2">{f.icon}</div>
                          <p className="font-bold text-gray-900 text-sm mb-1">{f.title}</p>
                          <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Inclus / Non inclus */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Check size={13} className="text-[#0f5132]" strokeWidth={2.5} />
                        </span>
                        Ce qui est inclus
                      </h3>
                      <ul className="space-y-2">
                        {offer.included.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                            <Check size={13} className="text-[#0f5132] flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center">
                          <X size={13} className="text-amber-500" strokeWidth={2.5} />
                        </span>
                        Non inclus
                      </h3>
                      <ul className="space-y-2">
                        {offer.notIncluded.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                            <X size={13} className="text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* ─ HÔTELS ─ */}
              {activeTab === "hotels" && (
                <div className="space-y-5">
                  {offer.hotels.map((h) => (
                    <div key={h.city} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className={`text-xs font-bold tracking-widest uppercase mb-1 ${accentText}`}>{h.city}</p>
                          <h3 className="text-xl font-bold text-gray-900">{h.name}</h3>
                        </div>
                        <div className="flex">
                          {[1,2,3,4].map((s) => <Star key={s} size={14} className="text-amber-400 fill-amber-400" />)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Check-in",  value: h.checkin  ?? "Bientôt disponible" },
                          { label: "Check-out", value: h.checkout ?? "Bientôt disponible" },
                          { label: "Durée",     value: h.nights ? `${h.nights} nuits` : "Bientôt disponible" },
                          { label: "Distance",  value: h.distance },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className="text-xs text-gray-400 mb-1">{label}</p>
                            <p className="text-sm font-semibold text-gray-900">{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <MapPin size={12} className={accentText} />
                        Pension : {h.pension}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ─ VOLS ─ */}
              {activeTab === "vols" && (
                <div className="space-y-5">
                  {offer.flights.map((f) => (
                    <div key={f.direction} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <p className={`text-xs font-bold tracking-widest uppercase mb-4 ${accentText}`}>Vol {f.direction}</p>
                      <div className="flex items-center gap-4 mb-5">
                        <div className="text-center">
                          <p className="text-lg font-black text-gray-900">{f.departTime ?? "—"}</p>
                          <p className="text-xs text-gray-500">{f.from}</p>
                          <p className="text-xs text-gray-400">{f.date ?? "Date à confirmer"}</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 w-full">
                            <div className="h-px flex-1 bg-gray-200" />
                            <Plane size={16} className={`${accentText} rotate-90`} />
                            <div className="h-px flex-1 bg-gray-200" />
                          </div>
                          <p className="text-xs text-gray-400">{f.stopover ?? "Direct"}</p>
                          <p className="text-xs font-semibold text-gray-700">{f.airline}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-black text-gray-900">{f.arrivalTime ?? "—"}</p>
                          <p className="text-xs text-gray-500">{f.to}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-base">🧳</span>
                          Soute : <strong>{f.bagageSoute}</strong>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-base">💼</span>
                          Cabine : <strong>{f.bagageCabine}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ─ TARIFS ─ */}
              {activeTab === "tarifs" && (
                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <div className={`px-6 py-4 ${accentClass} text-white`}>
                    <h2 className="font-bold text-lg">Tarif par personne</h2>
                    <p className="text-white/70 text-sm">Tous les prix incluent vol, hébergement et encadrement</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {offer.pricing.map((p) => (
                      <div key={p.label} className={`flex items-center justify-between px-6 py-4 ${p.highlight ? "bg-emerald-50/50" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Users size={16} className="text-gray-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{p.label}</p>
                            <p className="text-xs text-gray-400">{p.sublabel}</p>
                          </div>
                          {p.highlight && <span className="text-xs bg-emerald-100 text-[#0f5132] font-bold px-2 py-0.5 rounded-full">Populaire</span>}
                        </div>
                        <div className="text-right">
                          {p.price ? (
                            <>
                              <p className={`text-lg font-black ${accentText}`}>{p.price.toLocaleString("fr-FR")}</p>
                              <p className="text-xs text-gray-400">FCFA</p>
                            </>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Bientôt disponible</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-6 py-5 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-4">
                      💳 Acompte de <strong>500 000 FCFA</strong> à la réservation. Paiement par virement, chèque ou carte bancaire.
                    </p>
                    <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 ${btnClass} text-white font-bold text-sm px-6 py-3 rounded-xl transition-all hover:scale-105`}>
                      Réserver maintenant <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              )}

              {/* ─ PROGRAMME ─ */}
              {activeTab === "programme" && (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Programme jour par jour</h2>
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />
                    <div className="space-y-6">
                      {offer.program.map((step) => (
                        <div key={step.step} className="flex gap-5 relative">
                          <div className={`w-10 h-10 rounded-full ${accentClass} flex items-center justify-center flex-shrink-0 z-10 shadow-sm`}>
                            <span className="text-white text-xs font-black">{step.step}</span>
                          </div>
                          <div className="flex-1 pb-2">
                            <p className="font-bold text-gray-900 text-sm mb-1">{step.title}</p>
                            <p className="text-gray-600 text-sm leading-relaxed">{step.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─ DOCUMENTS ─ */}
              {activeTab === "documents" && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <p className="text-amber-800 font-semibold text-sm flex items-center gap-2">
                      ⚠️ Ces documents sont obligatoires pour l&apos;obtention du visa et le voyage.
                    </p>
                  </div>
                  {offer.documents.map((doc) => (
                    <div key={doc.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
                      <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                        {doc.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm mb-1">{doc.title}</p>
                        <p className="text-gray-600 text-sm leading-relaxed">{doc.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* ── RIGHT SIDEBAR ──────────────────── */}
            <aside className="space-y-5">

              {/* Price card */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-[140px]">
                <div className={`${accentClass} px-5 py-4 text-white`}>
                  <p className="text-xs text-white/70 mb-1">Oumra tout compris</p>
                  <p className="text-3xl font-black">{offer.priceFrom.toLocaleString("fr-FR")}</p>
                  <p className="text-sm text-white/70">{offer.priceCurrency} / pers.</p>
                </div>
                <div className="p-5 space-y-3">
                  {offer.departure && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar size={14} className={accentText} />
                      <span>Départ : <strong>{offer.departure}</strong></span>
                    </div>
                  )}
                  {offer.returnDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar size={14} className={accentText} />
                      <span>Retour : <strong>{offer.returnDate}</strong></span>
                    </div>
                  )}
                  {offer.duration && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock size={14} className={accentText} />
                      <span><strong>{offer.duration}</strong></span>
                    </div>
                  )}
                  <div className="pt-2 space-y-2">
                    <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 w-full ${btnClass} text-white font-bold text-sm py-3 rounded-xl transition-all hover:scale-105`}>
                      Réserver <ArrowRight size={14} />
                    </a>
                    <a href="tel:+22796969070"
                      className="flex items-center justify-center gap-2 w-full border-2 border-gray-200 text-gray-700 font-semibold text-sm py-3 rounded-xl hover:border-emerald-300 transition-all">
                      <Phone size={14} /> Appeler
                    </a>
                  </div>
                  <p className="text-xs text-center text-gray-400 pt-1">Acompte 500 000 FCFA à la réservation</p>
                </div>
              </div>

              {/* Other offers */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-4">Autres départs</p>
                <div className="space-y-3">
                  {OFFERS.filter((o) => o.slug !== offer.slug).map((o) => (
                    <Link key={o.slug} href={`/offres/${o.slug}` as `/offres/${string}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all group">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-[#0f5132] transition-colors">{o.title}</p>
                        {o.departure && <p className="text-xs text-gray-400">{o.departure}</p>}
                        <p className="text-xs font-bold text-[#0f5132] mt-0.5">
                          à partir de {o.priceFrom.toLocaleString("fr-FR")} {o.priceCurrency}
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-[#0f5132] transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-[#062b1a] rounded-2xl p-5 text-white">
                <p className="font-bold text-sm mb-1">Une question ?</p>
                <p className="text-white/60 text-xs mb-4">Notre équipe répond 7j/7</p>
                <div className="space-y-2">
                  <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors">
                    <IconWhatsApp size={16} /> WhatsApp
                  </a>
                  <a href="tel:+22796969070"
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors">
                    <Phone size={14} /> +227 96 96 39 61
                  </a>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ─────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="section-label mb-2">ILS NOUS ONT FAIT CONFIANCE</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900" style={{ fontFamily: "var(--font-playfair, serif)" }}>
              Ce que disent nos pèlerins
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} className="text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4 flex-1">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={9} />{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────── */}
      <section className="relative bg-[#062b1a] py-20 overflow-hidden text-center text-white px-4">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #fbbf24, transparent 50%)" }} />
        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black mb-3" style={{ fontFamily: "var(--font-playfair, serif)" }}>
            Prêt à accomplir votre {offer.type === "HADJ" ? "Hadj" : "Oumra"} ?
          </h2>
          <p className="text-white/60 mb-8">Rejoignez les pèlerins qui nous ont fait confiance depuis plus de 25 ans.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
              className="btn-gold hover:scale-105 transition-transform px-8 py-3.5">
              <IconWhatsApp size={16} /> WhatsApp
            </a>
            <Link href="/offres"
              className="px-8 py-3.5 rounded-full border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-all text-sm">
              Voir toutes les offres
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
