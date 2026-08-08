"use client";

import { useState, useEffect } from "react";
import type { SerializedOffer } from "./VoyagesClient";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  titleFr: string;
  type: string;
  descFr: string;
  departureDate: string;
  returnDate: string;
  priceAdult: string;
  priceCouple: string;
  priceChild: string;
  priceBaby: string;
  currency: string;
  maxCapacity: string;
  provisional: boolean;
}

interface CreateVoyageModalProps {
  offer: SerializedOffer | null;
  onClose: () => void;
  onSaved: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDuration(from: string, to: string): number | null {
  if (!from || !to) return null;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  if (isNaN(diff) || diff <= 0) return null;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateVoyageModal({
  offer,
  onClose,
  onSaved,
}: CreateVoyageModalProps) {
  const isEdit = !!offer;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormData>({
    titleFr: offer?.titleFr ?? "",
    type: offer?.type ?? "UMRAH",
    descFr: offer?.descFr ?? "",
    departureDate: offer?.departureDate ? offer.departureDate.substring(0, 10) : "",
    returnDate: offer?.returnDate ? offer.returnDate.substring(0, 10) : "",
    priceAdult: offer?.priceAdult !== undefined ? String(offer.priceAdult) : "",
    priceCouple: offer?.priceCouple !== null && offer?.priceCouple !== undefined ? String(offer.priceCouple) : "",
    priceChild: offer?.priceChild !== null && offer?.priceChild !== undefined ? String(offer.priceChild) : "",
    priceBaby: offer?.priceBaby !== null && offer?.priceBaby !== undefined ? String(offer.priceBaby) : "",
    currency: offer?.currency ?? "FCFA",
    maxCapacity: offer?.maxCapacity ? String(offer.maxCapacity) : "",
    provisional: offer?.provisional ?? false,
  });

  const duration = calcDuration(form.departureDate, form.returnDate);

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleField(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.titleFr.trim()) {
      setError("Le nom du voyage est obligatoire.");
      return;
    }
    if (!form.type) {
      setError("Le type de voyage est obligatoire.");
      return;
    }
    if (!form.priceAdult || isNaN(Number(form.priceAdult))) {
      setError("Le tarif adulte est obligatoire.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        titleFr: form.titleFr.trim(),
        type: form.type,
        descFr: form.descFr.trim(),
        departureDate: form.departureDate || null,
        returnDate: form.returnDate || null,
        priceAdult: Number(form.priceAdult),
        priceCouple: form.priceCouple ? Number(form.priceCouple) : null,
        priceChild: form.priceChild ? Number(form.priceChild) : null,
        priceBaby: form.priceBaby ? Number(form.priceBaby) : null,
        currency: form.currency,
        maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : null,
        provisional: form.provisional,
      };

      const url = isEdit
        ? `/api/agency-admin/voyages/${offer.id}`
        : "/api/agency-admin/voyages";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      onSaved();
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0f5132]" />
            <h3 className="font-bold text-gray-800 text-base">
              {isEdit ? "Modifier le Voyage" : "Créer un nouveau Voyage"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* ── Informations générales ── */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              Informations générales
            </p>

            {/* Nom du voyage */}
            <div className="mb-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Nom du Voyage (FR) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.titleFr}
                onChange={(e) => handleField("titleFr", e.target.value)}
                placeholder="Ex: Hajj Standard Confort 2026"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
              />
            </div>

            {/* Type + Provisoire */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => handleField("type", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-700 transition cursor-pointer"
                >
                  <option value="HAJJ">Hajj</option>
                  <option value="UMRAH">Umrah</option>
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                      form.provisional
                        ? "bg-[#0f5132] border-[#0f5132]"
                        : "border-gray-300 group-hover:border-[#0f5132]/50"
                    }`}
                    onClick={() => handleField("provisional", !form.provisional)}
                  >
                    {form.provisional && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={form.provisional}
                    onChange={(e) => handleField("provisional", e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-xs text-gray-600 leading-tight">
                    Voyage provisoire<br />
                    <span className="text-gray-400 text-[10px]">(dates non confirmées)</span>
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* ── Tarification ── */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              Tarification
            </p>
            <div className="grid grid-cols-2 gap-4">
              <PriceField
                label="Tarif Adulte"
                required
                value={form.priceAdult}
                onChange={(v) => handleField("priceAdult", v)}
                placeholder="Ex: 3 500 000"
              />
              <PriceField
                label="Tarif Couple"
                value={form.priceCouple}
                onChange={(v) => handleField("priceCouple", v)}
                placeholder="Ex: 6 500 000"
              />
              <PriceField
                label="Tarif Enfant"
                value={form.priceChild}
                onChange={(v) => handleField("priceChild", v)}
                placeholder="Ex: 2 500 000"
              />
              <PriceField
                label="Tarif Bébé"
                value={form.priceBaby}
                onChange={(v) => handleField("priceBaby", v)}
                placeholder="Ex: 800 000"
              />
            </div>
          </section>

          {/* ── Dates ── */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              Dates
            </p>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Date de Départ
                </label>
                <input
                  type="date"
                  value={form.departureDate}
                  onChange={(e) => handleField("departureDate", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-700 transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Date de Retour
                </label>
                <input
                  type="date"
                  value={form.returnDate}
                  onChange={(e) => handleField("returnDate", e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-700 transition"
                />
              </div>
            </div>
            {duration !== null && (
              <p className="text-[#0f5132] text-sm font-semibold">
                Durée : {duration} jour{duration > 1 ? "s" : ""}
              </p>
            )}
          </section>

          {/* ── Capacité ── */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              Capacité
            </p>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Nombre Max de Pèlerins
              </label>
              <input
                type="number"
                min="0"
                value={form.maxCapacity}
                onChange={(e) => handleField("maxCapacity", e.target.value)}
                placeholder="Ex: 100"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
              />
            </div>
          </section>

          {/* ── Description ── */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              Description
            </p>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Description (FR)
              </label>
              <textarea
                value={form.descFr}
                onChange={(e) => handleField("descFr", e.target.value)}
                placeholder="Décrivez le programme, les services inclus, les hébergements..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 resize-none transition"
              />
            </div>
          </section>

          {/* ── Error ── */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* ── Footer ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#0f5132] hover:bg-[#0d4429] rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Enregistrement...
                </>
              ) : (
                isEdit ? "Enregistrer les modifications" : "Enregistrer le Voyage"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── PriceField ───────────────────────────────────────────────────────────────

function PriceField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-14 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
          FCFA
        </span>
      </div>
    </div>
  );
}
