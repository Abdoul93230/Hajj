"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plane, Calendar, Users, X, Check } from "lucide-react";

export type PackOffer = {
  id: string;
  titleFr: string;
  type: string;
  descFr: string;
  departureDate: string | null;
  returnDate: string | null;
  currency: string;
  priceAdult: number;
  priceChild: number | null;
  priceBaby: number | null;
  priceCouple: number | null;
  provisional: boolean;
  confirmedCount: number;
  maxCapacity: number;
  alreadyBooked: boolean;
};

const CATEGORIES = ["ADULT", "COUPLE", "CHILD", "BABY"] as const;

export default function PacksClient({ offers }: { offers: PackOffer[] }) {
  const t = useTranslations("portal.packs");
  const router = useRouter();

  const [booking, setBooking] = useState<PackOffer | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("ADULT");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function fmtMoney(n: number, cur: string) {
    return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} ${cur}`;
  }
  function fmtDate(iso: string | null) {
    return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : null;
  }
  function priceOf(o: PackOffer, cat: string): number {
    if (cat === "CHILD") return o.priceChild ?? o.priceAdult;
    if (cat === "BABY") return o.priceBaby ?? o.priceAdult;
    if (cat === "COUPLE") return o.priceCouple ?? o.priceAdult;
    return o.priceAdult;
  }
  function isFull(o: PackOffer) {
    return o.maxCapacity > 0 && o.confirmedCount >= o.maxCapacity;
  }

  async function handleBook() {
    if (!booking) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: booking.id, category, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error ?? t("errorGeneric") });
      } else {
        setMsg({ ok: true, text: t("modal.success") });
        router.refresh();
        setTimeout(() => {
          setBooking(null);
          setNotes("");
          setMsg(null);
        }, 1400);
      }
    } catch {
      setMsg({ ok: false, text: t("errorGeneric") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {offers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-sm text-gray-400">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {offers.map((o) => {
            const full = isFull(o);
            const booked = o.alreadyBooked;
            return (
              <div
                key={o.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col ${
                  booked ? "border-[#0f5132]/40" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0f5132]/10 text-[#0f5132]">
                      <Plane size={10} /> {o.type}
                    </span>
                    {o.provisional && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                        {t("provisional")}
                      </span>
                    )}
                    {booked && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0f5132] text-white">
                        ✓ {t("booked")}
                      </span>
                    )}
                  </div>
                </div>

                <h2 className="text-base font-bold text-gray-900 mt-2">{o.titleFr}</h2>
                {o.descFr && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{o.descFr}</p>
                )}

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} className="text-gray-400" />
                    {fmtDate(o.departureDate) ?? "—"}
                  </span>
                  {o.returnDate && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-gray-400" />
                      {fmtDate(o.returnDate)}
                    </span>
                  )}
                </div>

                {/* Tarifs par catégorie */}
                <div className="grid grid-cols-2 gap-1.5 mt-3">
                  {CATEGORIES.map((cat) => (
                    <div key={cat} className="rounded-lg bg-gray-50 px-2.5 py-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-500">{t(`category.${cat}`)}</span>
                      <span className="text-xs font-bold text-gray-800">
                        {fmtMoney(priceOf(o, cat), o.currency)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Capacité + réservation */}
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                  <Users size={12} className="text-gray-400" />
                  {o.maxCapacity > 0 ? (
                    full ? (
                      <span className="font-semibold text-red-500">{t("full")}</span>
                    ) : (
                      <span>{t("placesLeft", { n: o.maxCapacity - o.confirmedCount })}</span>
                    )
                  ) : (
                    <span className="text-gray-300 italic">{t("capacityNA")}</span>
                  )}
                </div>

                <div className="mt-auto pt-4">
                  <button
                    type="button"
                    disabled={booked || full}
                    onClick={() => { setBooking(o); setCategory("ADULT"); setMsg(null); }}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                      booked
                        ? "bg-[#0f5132]/10 text-[#0f5132] cursor-default"
                        : full
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-[#0f5132] hover:bg-[#0d4429] text-white shadow-sm"
                    }`}
                  >
                    {booked ? <Check size={15} /> : null}
                    {booked ? t("booked") : full ? t("full") : t("book")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {booking && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setBooking(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{t("modal.title")}</h2>
                <p className="text-sm text-gray-500">{booking.titleFr}</p>
              </div>
              <button onClick={() => setBooking(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            {msg && (
              <div
                className={`text-sm rounded-lg px-4 py-2.5 mt-4 ${
                  msg.ok
                    ? "bg-green-50 border border-green-100 text-green-700"
                    : "bg-amber-50 border border-amber-200 text-amber-700"
                }`}
              >
                {msg.text}
              </div>
            )}

            <p className="text-xs font-semibold text-gray-600 mt-5 mb-2">{t("modal.category")}</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    category === cat
                      ? "border-[#0f5132] bg-[#0f5132]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-700">{t(`category.${cat}`)}</p>
                  <p className="text-sm font-bold text-[#0f5132]">
                    {fmtMoney(priceOf(booking, cat), booking.currency)}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("modal.notes")}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setBooking(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
              >
                {t("modal.cancel")}
              </button>
              <button
                type="button"
                onClick={handleBook}
                disabled={loading}
                className="flex-[2] bg-[#0f5132] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0d4429] transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? t("modal.booking") : t("modal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}