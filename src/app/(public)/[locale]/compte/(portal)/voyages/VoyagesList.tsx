"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calendar, Users, X, Check, Plane, Landmark } from "lucide-react";

export type VoyageOffer = {
  id: string;
  titleFr: string;
  type: string;
  descFr: string;
  departureDate: string | null;
  returnDate: string | null;
  currency: string;
  priceAdult: number;
  provisional: boolean;
  confirmedCount: number;
  maxCapacity: number;
  alreadyBooked: boolean;
  bookingClosed: boolean;
};

export default function VoyagesList({ offers }: { offers: VoyageOffer[] }) {
  const t = useTranslations("portal.voyages");
  const router = useRouter();
  const [booking, setBooking] = useState<VoyageOffer | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function fmtMoney(n: number, cur: string) {
    return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} ${cur}`;
  }
  function fmtDate(iso: string | null) {
    return iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : null;
  }
  function isFull(o: VoyageOffer) {
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
        body: JSON.stringify({ offerId: booking.id, category: "ADULT", notes }),
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

  // ── Regroupement par catégorie : Hajj / Omra ──
  const grouped: Record<"HAJJ" | "OMRAH", VoyageOffer[]> = {
    HAJJ: offers.filter((o) => o.type === "HAJJ"),
    OMRAH: offers.filter((o) => o.type === "UMRAH"),
  };

  for (const key of ["HAJJ", "OMRAH"] as const) {
    grouped[key].sort((a, b) => {
      if (!a.departureDate) return 1;
      if (!b.departureDate) return -1;
      return a.departureDate.localeCompare(b.departureDate);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── 2 sections distinctes : Hajj / Omra ── */}
      {(
        (grouped.HAJJ.length === 0 && grouped.OMRAH.length === 0)
      ) ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-sm text-gray-400">{t("empty")}</p>
        </div>
      ) : (
        <>
          {grouped.HAJJ.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                <span className="w-8 h-8 rounded-full bg-[#0f5132]/10 text-[#0f5132] flex items-center justify-center">
                  <Landmark size={16} />
                </span>
                <h2 className="text-xl font-bold text-gray-900">{t("sections.hajj")}</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {grouped.HAJJ.map((o) => (
                  <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
                    <h3 className="text-base font-bold text-gray-900">{o.titleFr}</h3>
                    {o.descFr && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{o.descFr}</p>}
                    <div className="mt-3 text-xs text-gray-600">
                      <Calendar size={12} className="text-gray-400 inline mr-1" />
                      {t("departure")} : {fmtDate(o.departureDate) ?? "—"} · {t("return")} : {fmtDate(o.returnDate) ?? "—"}
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500">{t("from")} <span className="text-lg font-black text-[#0f5132]">{fmtMoney(o.priceAdult, o.currency)}</span></p>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <Users size={12} className="text-gray-400 inline mr-1" />
                      {o.maxCapacity > 0 ? (isFull(o) ? <span className="font-semibold text-red-500">{t("full")}</span> : <span>{t("placesLeft", { n: o.maxCapacity - o.confirmedCount })}</span>) : <span className="italic text-gray-300">{t("capacityNA")}</span>}
                    </div>
                    {o.bookingClosed && (
                      <div className="mt-2 inline-flex items-center gap-1 self-start text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        <Calendar size={10} />
                        {t("closed")}
                      </div>
                    )}
                    <div className="mt-auto pt-4">
                      <button type="button" disabled={o.alreadyBooked || isFull(o) || o.bookingClosed} onClick={() => { setBooking(o); setMsg(null); }}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                          o.alreadyBooked ? "bg-[#0f5132]/10 text-[#0f5132] cursor-default"
                          : isFull(o) || o.bookingClosed ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-[#0f5132] hover:bg-[#0d4429] text-white shadow-sm"
                        }`}>
                        {o.alreadyBooked ? <Check size={15} /> : null}
                        {o.alreadyBooked ? t("booked") : isFull(o) ? t("full") : o.bookingClosed ? t("closed") : t("book")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {grouped.OMRAH.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Plane size={16} />
                </span>
                <h2 className="text-xl font-bold text-gray-900">{t("sections.umrah")}</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                {grouped.OMRAH.map((o) => (
                  <div key={o.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
                    <h3 className="text-base font-bold text-gray-900">{o.titleFr}</h3>
                    {o.descFr && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{o.descFr}</p>}
                    <div className="mt-3 text-xs text-gray-600">
                      <Calendar size={12} className="text-gray-400 inline mr-1" />
                      {t("departure")} : {fmtDate(o.departureDate) ?? "—"} · {t("return")} : {fmtDate(o.returnDate) ?? "—"}
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500">{t("from")} <span className="text-lg font-black text-[#0f5132]">{fmtMoney(o.priceAdult, o.currency)}</span></p>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      <Users size={12} className="text-gray-400 inline mr-1" />
                      {o.maxCapacity > 0 ? (isFull(o) ? <span className="font-semibold text-red-500">{t("full")}</span> : <span>{t("placesLeft", { n: o.maxCapacity - o.confirmedCount })}</span>) : <span className="italic text-gray-300">{t("capacityNA")}</span>}
                    </div>
                    {o.bookingClosed && (
                      <div className="mt-2 inline-flex items-center gap-1 self-start text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        <Calendar size={10} />
                        {t("closed")}
                      </div>
                    )}
                    <div className="mt-auto pt-4">
                      <button type="button" disabled={o.alreadyBooked || isFull(o) || o.bookingClosed} onClick={() => { setBooking(o); setMsg(null); }}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                          o.alreadyBooked ? "bg-[#0f5132]/10 text-[#0f5132] cursor-default"
                          : isFull(o) || o.bookingClosed ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-[#0f5132] hover:bg-[#0d4429] text-white shadow-sm"
                        }`}>
                        {o.alreadyBooked ? <Check size={15} /> : null}
                        {o.alreadyBooked ? t("booked") : isFull(o) ? t("full") : o.bookingClosed ? t("closed") : t("book")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
                <p className="mt-2 text-sm font-black text-[#0f5132]">
                  {t("from")} {fmtMoney(booking.priceAdult, booking.currency)}
                </p>
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

            <div className="mt-5">
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