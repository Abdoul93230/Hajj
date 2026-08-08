import { Link } from "@/i18n/navigation";
import { ArrowRight, Calendar, Clock, Plane, Users, Check } from "lucide-react";
import IconWhatsApp from "@/components/ui/IconWhatsApp";
import { OFFERS } from "@/lib/offers-data";

export default function OffresPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative bg-[#06251a] py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/images/kaaba.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#06251a]/80 to-[#06251a]" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label text-amber-400 mb-3">NOS VOYAGES</p>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4" style={{ fontFamily: "var(--font-playfair, serif)" }}>
            Hadj &amp; Oumra 2026–2027
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Choisissez votre formule et accomplissez votre pèlerinage en toute sérénité depuis Niamey.
          </p>
        </div>
      </section>

      {/* Offers */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {OFFERS.map((offer) => (
            <div key={offer.slug} id={offer.slug}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-24 hover:shadow-lg transition-shadow">

              {/* Header band */}
              <div className={`px-6 py-4 flex items-center justify-between ${
                offer.badgeColor === "amber"  ? "bg-amber-700"  :
                offer.badgeColor === "purple" ? "bg-purple-800" :
                "bg-[#0f5132]"
              } text-white`}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full tracking-wider">{offer.type}</span>
                  <h2 className="font-bold text-lg">{offer.title}</h2>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  offer.available ? "bg-white/20 text-white" : "bg-black/20 text-white/70"
                }`}>
                  {offer.badge}
                </span>
              </div>

              <div className="p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-start">
                  {/* Left */}
                  <div>
                    {/* Quick stats */}
                    <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
                      {offer.departure && (
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-[#0f5132]" />
                          Départ : <strong className="text-gray-900">{offer.departure}</strong>
                        </span>
                      )}
                      {offer.returnDate && (
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-[#0f5132]" />
                          Retour : <strong className="text-gray-900">{offer.returnDate}</strong>
                        </span>
                      )}
                      {offer.duration && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-[#0f5132]" />
                          <strong className="text-gray-900">{offer.duration}</strong>
                        </span>
                      )}
                      {offer.airline && (
                        <span className="flex items-center gap-1.5">
                          <Plane size={14} className="text-[#0f5132]" />
                          <strong className="text-gray-900">{offer.airline}</strong>
                        </span>
                      )}
                    </div>

                    {/* Hotels */}
                    <div className="flex flex-wrap gap-3 mb-6">
                      {offer.hotels.map((h) => (
                        <div key={h.city} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                          <span className="text-base">🏨</span>
                          <div>
                            <p className="font-semibold text-gray-900 text-xs">{h.city} — {h.name}</p>
                            <p className="text-gray-400 text-xs">{h.distance}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Included */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {offer.included.slice(0, 6).map((item) => (
                        <div key={item} className="flex items-center gap-2 text-xs text-gray-600">
                          <Check size={12} className="text-[#0f5132] flex-shrink-0" strokeWidth={2.5} />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right — price + CTA */}
                  <div className="md:min-w-[200px] flex flex-col items-center md:items-end gap-4">
                    <div className="text-center md:text-right">
                      <p className="text-xs text-gray-400 mb-1">à partir de</p>
                      <p className="text-3xl font-black text-[#0f5132]">
                        {offer.priceFrom.toLocaleString("fr-FR")}
                      </p>
                      <p className="text-sm text-gray-500">{offer.priceCurrency} / pers.</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-auto">
                      <Link href={`/offres/${offer.slug}` as `/offres/${string}`}
                        className={`flex items-center justify-center gap-2 font-bold text-sm px-6 py-3 rounded-xl text-white transition-all hover:scale-105 ${
                          offer.badgeColor === "amber"  ? "bg-amber-600 hover:bg-amber-500"   :
                          offer.badgeColor === "purple" ? "bg-purple-700 hover:bg-purple-600" :
                          "bg-[#0f5132] hover:bg-[#0f5132]"
                        }`}>
                        Voir les détails <ArrowRight size={14} />
                      </Link>
                      {offer.available && (
                        <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 font-semibold text-sm px-6 py-3 rounded-xl border-2 border-[#0f5132] text-[#0f5132] hover:bg-emerald-50 transition-all">
                          <Users size={14} /> Réserver
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#062b1a] py-14 px-4 text-center text-white">
        <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-3">Une question ?</p>
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Contactez notre équipe</h2>
        <p className="text-white/60 mb-7 text-sm">Disponible du lundi au samedi de 9h à 18h</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href="https://wa.me/22796969070" target="_blank" rel="noopener noreferrer"
            className="btn-gold flex items-center gap-2"><IconWhatsApp size={16} /> WhatsApp</a>
          <a href="tel:+22796969070" className="px-6 py-2.5 rounded-full border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition">
            📞 Appeler
          </a>
        </div>
      </section>
    </>
  );
}
