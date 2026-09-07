"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AddPilgrimModal from "../AddPilgrimModal";
import type { SerializedPilgrim, SerializedOffer, SerializedReservation } from "../PilgrimsClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["#0f5132","#1e40af","#7c3aed","#c2410c","#be185d","#0e7490"];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return (p[0][0] ?? "?").toUpperCase();
  return ((p[0][0] ?? "") + (p[p.length - 1][0] ?? "")).toUpperCase();
}

function getAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function fmt(n: number, cur: string) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " " + cur;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  NOUVEAU:     { label: "Nouveau",      bg: "bg-gray-100",    text: "text-gray-500"   },
  EN_COURS:    { label: "En cours",     bg: "bg-orange-100",  text: "text-orange-600" },
  COMPLET:     { label: "Complet",      bg: "bg-blue-100",    text: "text-blue-700"   },
  VISA_DEPOSE: { label: "Visa déposé",  bg: "bg-purple-100",  text: "text-purple-700" },
  VISA_OK:     { label: "Visa obtenu",  bg: "bg-green-100",   text: "text-green-700"  },
  PARTI:       { label: "En voyage",    bg: "bg-cyan-100",    text: "text-cyan-700"   },
  RETOUR:      { label: "Retour",       bg: "bg-emerald-100", text: "text-emerald-700"},
  CANCELLED:   { label: "Annulé",       bg: "bg-red-100",     text: "text-red-600"    },
  // Compat anciens enregistrements
  PENDING:     { label: "Nouveau",      bg: "bg-gray-100",    text: "text-gray-500"   },
  INCOMPLETE:  { label: "En cours",     bg: "bg-orange-100",  text: "text-orange-600" },
  REGISTERED:  { label: "Complet",      bg: "bg-blue-100",    text: "text-blue-700"   },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  pilgrim:      SerializedPilgrim;
  offers:       SerializedOffer[];
  selectedYear: number;
}

export default function PilgrimDetailClient({ pilgrim, offers, selectedYear }: Props) {
  const router        = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [visaUploading, setVisaUploading] = useState(false);
  const visaInputRef  = useRef<HTMLInputElement>(null);

  async function markDossierDepose() {
    if (statusLoading) return;
    setStatusLoading(true);
    await fetch(`/api/agency-admin/pilgrims/${pilgrim.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pilgrimStatus: "VISA_DEPOSE" }),
    });
    setStatusLoading(false);
    router.refresh();
  }

  async function uploadVisa(file: File) {
    setVisaUploading(true);
    const fd = new FormData();
    fd.append("file",   file);
    fd.append("userId", pilgrim.id);
    fd.append("type",   "VISA");
    fd.append("status", "VALID");
    await fetch("/api/agency-admin/documents/upload", { method: "POST", body: fd });
    setVisaUploading(false);
    router.refresh();
  }

  const res: SerializedReservation | null = pilgrim.reservations[0] ?? null;
  const color    = avatarColor(pilgrim.name);
  const inits    = initials(pilgrim.name);
  const age      = getAge(pilgrim.birthDate);
  const status   = STATUS_MAP[pilgrim.pilgrimStatus] ?? STATUS_MAP.PENDING;
  const currency = res?.offer?.currency ?? "FCFA";

  const pmts = (res?.payments ?? []) as Array<{ amount: number; type: string; status: string }>;
  const paid = pmts.reduce((s, p) =>
    p.status === "COMPLETED" ? (p.type === "REFUND" ? s - p.amount : s + p.amount) : s, 0);
  const total     = res?.totalAmount ?? res?.offer?.priceAdult ?? 0;
  const remaining = Math.max(0, total - paid);
  const pct       = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const payStatus = total > 0 && paid >= total ? "paid" : paid > 0 ? "partial" : "none";

  const genderLabel = pilgrim.gender === "M" || pilgrim.gender === "Masculin" ? "Homme"
    : pilgrim.gender === "F" || pilgrim.gender === "Féminin" ? "Femme" : null;

  const PAY_BAR: Record<string, string> = {
    paid: "bg-green-500", partial: "bg-orange-400", none: "bg-gray-300",
  };

  return (
    <div className="space-y-6 w-full">

      {/* ── Back + header ── */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 border border-gray-200 hover:bg-gray-50 transition flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: "var(--font-playfair,serif)" }}>
            Dossier pèlerin
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Saison {selectedYear}
          </p>
        </div>
        <button onClick={() => setShowEdit(true)}
          className="flex items-center gap-2 bg-[#0f5132] hover:bg-[#0d4429] text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Modifier le dossier
        </button>
      </div>

      {/* ── Identity card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-5">
          {/* Avatar / Photo */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-sm overflow-hidden"
            style={{ backgroundColor: color }}>
            {pilgrim.photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={pilgrim.photoUrl} alt={pilgrim.name} className="w-full h-full object-cover" />
              : inits}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-gray-900 leading-tight">{pilgrim.name}</h2>
                <p className="text-gray-400 text-sm mt-0.5">
                  {[genderLabel, age !== null ? `${age} ans` : null, pilgrim.city, pilgrim.country]
                    .filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full flex-shrink-0 ${status.bg} ${status.text}`}>
                {status.label}
              </span>
            </div>

            {/* Contact */}
            <div className="flex flex-wrap gap-4 mt-3">
              {pilgrim.phone && (
                <a href={`tel:${pilgrim.phone}`}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#0f5132] transition">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {pilgrim.phone}
                </a>
              )}
              {pilgrim.address && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {pilgrim.address}
                </span>
              )}
              {pilgrim.profession && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {pilgrim.profession}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-5 pt-5 border-t border-gray-50">
          <button
            onClick={() => router.push(`/agency-admin/payments?pilgrimId=${pilgrim.id}&action=payment`)}
            disabled={payStatus === "paid"}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-xl transition ${
              payStatus === "paid"
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-[#0f5132] text-white hover:bg-[#0d4429] active:scale-95"
            }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {payStatus === "paid" ? "Soldé ✓" : "Versement"}
          </button>

          <button
            onClick={() => router.push(`/agency-admin/payments?pilgrimId=${pilgrim.id}&action=refund`)}
            disabled={pmts.length === 0}
            className="flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-xl border border-red-200 text-red-500 hover:bg-red-50 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Remboursement
          </button>

          <button
            onClick={() => router.push(`/agency-admin/payments?pilgrimId=${pilgrim.id}`)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-xl border border-blue-100 text-blue-600 hover:bg-blue-50 active:scale-95 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Paiements
          </button>

          <button
            onClick={() => router.push(`/agency-admin/documents?pilgrimId=${pilgrim.id}`)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Documents
          </button>

          <a href={`/agency-admin/badge/${pilgrim.id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
            Badge / Carte
          </a>
        </div>

        {/* ── Avancement du dossier ── */}
        {!["VISA_OK","PARTI","RETOUR","CANCELLED"].includes(pilgrim.pilgrimStatus) && (
          <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-2">
            <p className="w-full text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Avancement du dossier</p>

            {/* Dossier déposé → visible uniquement si COMPLET et pas encore déposé */}
            {pilgrim.pilgrimStatus === "COMPLET" && (
              <button
                onClick={markDossierDepose}
                disabled={statusLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 active:scale-95 transition disabled:opacity-60">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {statusLoading ? "…" : "Marquer dossier déposé"}
              </button>
            )}

            {/* Upload visa → visible si COMPLET ou VISA_DEPOSE */}
            {["COMPLET","VISA_DEPOSE","NOUVEAU","EN_COURS"].includes(pilgrim.pilgrimStatus) && (
              <>
                <input
                  ref={visaInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadVisa(f); e.target.value = ""; }}
                />
                <button
                  onClick={() => visaInputRef.current?.click()}
                  disabled={visaUploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 active:scale-95 transition disabled:opacity-60">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {visaUploading ? "Upload…" : "Uploader le visa → Visa obtenu"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* ── Left col (3/4) ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Informations personnelles */}
          <Section title="Informations personnelles">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-0">
              <InfoRow label="Genre"       value={genderLabel} />
              <InfoRow label="Date de naissance" value={
                pilgrim.birthDate
                  ? `${fmtDate(pilgrim.birthDate)}${age !== null ? ` (${age} ans)` : ""}`
                  : null
              } />
              <InfoRow label="Téléphone"   value={pilgrim.phone} />
              <InfoRow label="Ville"       value={pilgrim.city} />
              <InfoRow label="Pays"        value={pilgrim.country} />
              <InfoRow label="Adresse"     value={pilgrim.address} />
              <InfoRow label="Profession"  value={pilgrim.profession} />
              <InfoRow label="Enregistré"  value={fmtDate(pilgrim.createdAt)} />
            </div>
          </Section>

          {/* Réservation */}
          {res && (
            <Section title="Réservation">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-0">
                <InfoRow label="Offre"    value={res.offer.titleFr} />
                <InfoRow label="Type"     value={res.offer.type} />
                <InfoRow label="Départ"   value={fmtDate(res.offer.departureDate)} />
                <InfoRow label="Retour"   value={fmtDate(res.offer.returnDate)} />
                <InfoRow label="Catégor." value={res.category} />
                <InfoRow label="Forfait"  value={fmt(res.offer.priceAdult, currency)} />
                {res.notes && <InfoRow label="Notes" value={res.notes} />}
              </div>
            </Section>
          )}

          {/* Contact d'urgence */}
          {(pilgrim.emergencyName || pilgrim.emergencyPhone) && (
            <Section title="Contact d'urgence">
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  {pilgrim.emergencyName  && <p className="text-sm font-semibold text-gray-700">{pilgrim.emergencyName}</p>}
                  {pilgrim.emergencyPhone && <p className="text-sm text-gray-500 mt-0.5">{pilgrim.emergencyPhone}</p>}
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* ── Right col (1/3) ── */}
        <div className="space-y-5">

          {/* Paiement */}
          {res && total > 0 && (
            <div className={`rounded-2xl border p-5 ${
              payStatus === "paid" ? "bg-green-50 border-green-100" :
              payStatus === "partial" ? "bg-orange-50 border-orange-100" :
              "bg-gray-50 border-gray-100"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Paiement</p>
                <span className={`text-2xl font-black ${
                  payStatus === "paid" ? "text-green-600" :
                  payStatus === "partial" ? "text-orange-500" : "text-gray-400"
                }`}>{pct}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-200/80 rounded-full overflow-hidden mb-4">
                <div className={`h-full rounded-full transition-all ${PAY_BAR[payStatus]}`}
                  style={{ width: `${pct}%` }} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Forfait</span>
                  <span className="font-semibold text-gray-700">{fmt(total, currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Versé</span>
                  <span className={`font-bold ${payStatus === "paid" ? "text-green-600" : "text-gray-700"}`}>{fmt(paid, currency)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200/60 pt-2 mt-1">
                  <span className="text-gray-500">Reste</span>
                  <span className={`font-black ${remaining > 0 ? "text-orange-500" : "text-green-600"}`}>
                    {remaining > 0 ? fmt(remaining, currency) : "Soldé ✓"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          <Section title="Documents">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Passeport", ok: pilgrim.hasPassport },
                { label: "CNI",       ok: pilgrim.hasCni },
                { label: "Visa",      ok: ["VISA_OK","PARTI","RETOUR"].includes(pilgrim.pilgrimStatus) },
              ].map(({ label, ok }) => (
                <div key={label} className={`rounded-xl p-2.5 text-center border ${
                  ok ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"
                }`}>
                  <p className={`text-lg mb-0.5 ${ok ? "text-green-500" : "text-gray-300"}`}>{ok ? "✓" : "✗"}</p>
                  <p className={`text-[10px] font-semibold ${ok ? "text-green-600" : "text-gray-400"}`}>{label}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Infos compte */}
          <Section title="Compte">
            <div className="space-y-0">
              <InfoRow label="Créé le" value={fmtDate(pilgrim.createdAt)} />
              <InfoRow label="Modifié" value={fmtDate(pilgrim.updatedAt)} />
              {pilgrim.lastLoginAt && (
                <InfoRow label="Connexion" value={fmtDate(pilgrim.lastLoginAt)} />
              )}
            </div>
          </Section>
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <AddPilgrimModal
          pilgrim={pilgrim}
          offers={offers}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
      <span className="text-[10px] text-gray-400 uppercase tracking-wider w-28 flex-shrink-0 mt-0.5 leading-tight">{label}</span>
      <span className="text-sm text-gray-700 font-medium leading-snug">{value}</span>
    </div>
  );
}
