"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { SerializedPilgrim, SerializedOffer } from "./PilgrimsClient";

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  "Niger",
  "Mali",
  "Sénégal",
  "Burkina Faso",
  "Côte d'Ivoire",
  "Guinée",
  "Ghana",
  "Nigeria",
  "Cameroun",
  "France",
  "Maroc",
  "Algérie",
  "Mauritanie",
  "Bénin",
  "Togo",
];

const STATUT_OPTIONS = [
  { value: "PENDING", label: "En attente" },
  { value: "INCOMPLETE", label: "Incomplet" },
  { value: "REGISTERED", label: "Inscrit" },
  { value: "VISA_OK", label: "Visa OK" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  gender: string;
  birthDate: string;
  phone: string;
  email: string;
  profession: string;
  city: string;
  country: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
  // hasPassport / hasCni / hasVaccine : lecture seule, alimentés par les documents réels
  hasPassport: boolean;
  hasCni: boolean;
  hasVaccine: boolean;
  pilgrimStatus: string;
  offerId: string;
}

interface AddPilgrimModalProps {
  pilgrim: SerializedPilgrim | null;
  offers: SerializedOffer[];
  onClose: () => void;
  onSaved: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddPilgrimModal({
  pilgrim,
  offers,
  onClose,
  onSaved,
}: AddPilgrimModalProps) {
  const isEdit = !!pilgrim;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(pilgrim?.photoUrl ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentOfferId = useMemo(
    () => pilgrim?.reservations?.[0]?.offerId ?? "",
    [pilgrim]
  );

  const [form, setForm] = useState<FormData>({
    name: pilgrim?.name ?? "",
    gender: pilgrim?.gender ?? "",
    birthDate: pilgrim?.birthDate
      ? pilgrim.birthDate.substring(0, 10)
      : "",
    phone: pilgrim?.phone ?? "",
    email: pilgrim?.email?.endsWith(".nomail") ? "" : (pilgrim?.email ?? ""),
    profession: pilgrim?.profession ?? "",
    city: pilgrim?.city ?? "",
    country: pilgrim?.country ?? "",
    address: pilgrim?.address ?? "",
    emergencyName: pilgrim?.emergencyName ?? "",
    emergencyPhone: pilgrim?.emergencyPhone ?? "",
    hasPassport: pilgrim?.hasPassport ?? false,
    hasCni: pilgrim?.hasCni ?? false,
    hasVaccine: pilgrim?.hasVaccine ?? false,
    pilgrimStatus: pilgrim?.pilgrimStatus ?? "PENDING",
    offerId: currentOfferId,
  });

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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Le nom complet est obligatoire.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Le téléphone est obligatoire.");
      return;
    }
    if (!form.city.trim()) {
      setError("La ville est obligatoire.");
      return;
    }
    if (!form.country) {
      setError("Le pays est obligatoire.");
      return;
    }
    if (!form.emergencyName.trim() || !form.emergencyPhone.trim()) {
      setError("Le contact d'urgence (nom et téléphone) est obligatoire.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        gender: form.gender || null,
        birthDate: form.birthDate || null,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        profession: form.profession.trim() || null,
        city: form.city.trim(),
        country: form.country,
        address: form.address.trim() || null,
        emergencyName: form.emergencyName.trim(),
        emergencyPhone: form.emergencyPhone.trim(),
        pilgrimStatus: form.pilgrimStatus,
        // hasPassport / hasCni / hasVaccine gérés automatiquement par les documents
        // photoUrl: photoPreview — omitted for now (would need file upload)
      };

      const url = isEdit
        ? `/api/agency-admin/pilgrims/${pilgrim.id}`
        : "/api/agency-admin/pilgrims";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        setError(resData.error ?? "Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      const savedPilgrim = resData.pilgrim;

      // Gérer l'assignation voyage
      const offerId = form.offerId;
      const pilgrimId = isEdit ? pilgrim!.id : savedPilgrim?.id;

      if (offerId && pilgrimId) {
        // Assigner (ou changer) le voyage
        const rRes = await fetch("/api/agency-admin/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pilgrimId, offerId }),
        });
        if (!rRes.ok) {
          const rData = await rRes.json();
          setError(rData.error ?? "Pèlerin sauvegardé mais erreur d'assignation voyage.");
          return;
        }
      } else if (!offerId && isEdit && currentOfferId) {
        // Retrait du voyage (le pèlerin avait un voyage, on l'a vidé)
        const existingRes = pilgrim?.reservations?.[0];
        if (existingRes?.id) {
          await fetch("/api/agency-admin/reservations", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reservationId: existingRes.id }),
          });
        }
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
              {isEdit ? "Modifier le Pèlerin" : "Enregistrer un nouveau Pèlerin"}
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
          {/* ── Photo upload ── */}
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#0f5132]/40 hover:bg-[#0f5132]/[0.02] transition"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoPreview ? (
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Photo"
                  className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-[#0f5132]/20"
                />
                <p className="text-[#0f5132] text-xs font-medium">Changer la photo</p>
              </div>
            ) : (
              <>
                <svg
                  className="w-10 h-10 text-gray-300 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Photo d&apos;identité
                </p>
                <button
                  type="button"
                  className="text-xs font-semibold text-[#0f5132] bg-[#0f5132]/10 px-3 py-1.5 rounded-lg hover:bg-[#0f5132]/20 transition"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  Choisir un fichier
                </button>
                <p className="text-gray-300 text-[10px] mt-2">
                  Format recommandé : JPG/PNG de face
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* ── NOM + GENRE ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Nom Complet <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleField("name", e.target.value)}
                placeholder="Ex: El Hadji Abdoulaye Sall"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Genre <span className="text-red-400">*</span>
              </label>
              <select
                value={form.gender}
                onChange={(e) => handleField("gender", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-700 transition cursor-pointer"
              >
                <option value="">Sélectionner</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
          </div>

          {/* ── DATE + TÉLÉPHONE ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Date de Naissance <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => handleField("birthDate", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-700 transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Téléphone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleField("phone", e.target.value)}
                placeholder="+227 90 00 00 00"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
              />
            </div>
          </div>

          {/* ── EMAIL + PROFESSION ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleField("email", e.target.value)}
                placeholder="email@exemple.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Profession
              </label>
              <input
                type="text"
                value={form.profession}
                onChange={(e) => handleField("profession", e.target.value)}
                placeholder="Ex: Commerçant"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
              />
            </div>
          </div>

          {/* ── VILLE + PAYS ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Ville <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleField("city", e.target.value)}
                placeholder="Ex: Niamey"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Pays <span className="text-red-400">*</span>
              </label>
              <select
                value={form.country}
                onChange={(e) => handleField("country", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-700 transition cursor-pointer"
              >
                <option value="">Sélectionner</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── ADRESSE COMPLÈTE ── */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Adresse Complète
            </label>
            <textarea
              value={form.address}
              onChange={(e) => handleField("address", e.target.value)}
              placeholder="Quartier, rue, BP..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 resize-none transition"
            />
          </div>

          {/* ── CONTACT D'URGENCE ── */}
          <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-3 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Contact d&apos;urgence (Obligatoire)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Nom du Contact <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.emergencyName}
                  onChange={(e) => handleField("emergencyName", e.target.value)}
                  placeholder="Ex: Aminata Diallo"
                  className="w-full px-3 py-2 text-sm border border-orange-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300/50 focus:border-orange-400 placeholder:text-gray-300 transition"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Téléphone du Contact <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={form.emergencyPhone}
                  onChange={(e) => handleField("emergencyPhone", e.target.value)}
                  placeholder="+227 90 00 00 00"
                  className="w-full px-3 py-2 text-sm border border-orange-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300/50 focus:border-orange-400 placeholder:text-gray-300 transition"
                />
              </div>
            </div>
          </div>

          {/* ── VOYAGE ASSIGNÉ ── */}
          {offers.length > 0 && (
            <div className="rounded-xl border border-[#0f5132]/20 bg-[#0f5132]/[0.03] p-4">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#0f5132] mb-2.5 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
                </svg>
                Voyage Assigné
              </label>
              <select
                value={form.offerId}
                onChange={(e) => handleField("offerId", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#0f5132]/20 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-700 transition cursor-pointer"
              >
                <option value="">— Aucun voyage —</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.type === "HAJJ" ? "🕋" : "🌙"} {o.titleFr} — {new Intl.NumberFormat("fr-FR").format(o.priceAdult)} {o.currency}
                  </option>
                ))}
              </select>
              {form.offerId && (
                <p className="text-[11px] text-[#0f5132]/60 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Une réservation confirmée sera créée automatiquement.
                </p>
              )}
            </div>
          )}

          {/* ── DOCUMENTS (lecture seule) + STATUT ── */}
          <div className="grid grid-cols-2 gap-5">
            {/* Documents — indicateurs alimentés par la page Documents */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
                Documents reçus
                {isEdit && (
                  <a
                    href="/agency-admin/documents"
                    className="text-[#0f5132] underline underline-offset-2 font-normal normal-case tracking-normal"
                    style={{ fontSize: "10px" }}
                  >
                    (gérer →)
                  </a>
                )}
              </p>
              <div className="space-y-2">
                {[
                  { flag: form.hasPassport, label: "Passeport", short: "PASS" },
                  { flag: form.hasCni,      label: "CNI",        short: "CNI" },
                  { flag: form.hasVaccine,  label: "Vaccin",     short: "VAC" },
                ].map(({ flag, label, short }) => (
                  <div key={short} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                      flag ? "bg-[#0f5132] border-[#0f5132]" : "border-gray-200 bg-gray-50"
                    }`}>
                      {flag && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm ${flag ? "text-gray-700" : "text-gray-400"}`}>{label}</span>
                    {!isEdit && !flag && (
                      <span className="text-[9px] text-gray-300 ml-auto">via Docs</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Statut */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                Statut
              </label>
              <select
                value={form.pilgrimStatus}
                onChange={(e) => handleField("pilgrimStatus", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-700 transition cursor-pointer"
              >
                {STATUT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

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
                isEdit ? "Enregistrer les modifications" : "Enregistrer le Pèlerin"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

