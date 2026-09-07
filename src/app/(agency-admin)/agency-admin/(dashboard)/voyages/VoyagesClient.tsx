"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import CreateVoyageModal from "./CreateVoyageModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SerializedOffer = {
  id: string;
  tenantId: string;
  slug: string;
  type: string;
  titleFr: string;
  titleEn: string | null;
  titleAr: string | null;
  descFr: string;
  descEn: string | null;
  descAr: string | null;
  departureDate: string | null;
  returnDate: string | null;
  priceBaby: number | null;
  priceChild: number | null;
  priceAdult: number;
  priceCouple: number | null;
  currency: string;
  provisional: boolean;
  active: boolean;
  data: unknown;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  confirmedCount: number;
  maxCapacity: number;
};

type PilgrimBrief = {
  id: string;
  name: string;
  phone: string | null;
  gender: string | null;
  pilgrimStatus: string;
  hasPassport: boolean;
  hasCni: boolean;
  photoUrl: string | null;
  reservationId?: string;
  totalAmount?: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

function formatDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDurationDays(from: string, to: string): number {
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  NOUVEAU:     { label: "Nouveau",      cls: "bg-gray-100 text-gray-500" },
  EN_COURS:    { label: "En cours",     cls: "bg-orange-100 text-orange-600" },
  COMPLET:     { label: "Complet",      cls: "bg-blue-100 text-blue-600" },
  VISA_DEPOSE: { label: "Visa déposé",  cls: "bg-purple-100 text-purple-700" },
  PARTI:       { label: "En voyage",    cls: "bg-cyan-100 text-cyan-700" },
  RETOUR:      { label: "Retour",       cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED:   { label: "Annulé",       cls: "bg-red-100 text-red-500" },
  PENDING:     { label: "Nouveau",      cls: "bg-gray-100 text-gray-500" },
  INCOMPLETE:  { label: "En cours",     cls: "bg-orange-100 text-orange-600" },
  REGISTERED: { label: "Inscrit",    cls: "bg-blue-100 text-blue-600" },
  VISA_OK:    { label: "Visa OK",    cls: "bg-green-100 text-green-700" },
};

// ─── Component ────────────────────────────────────────────────────────────────

interface VoyagesClientProps {
  offers: SerializedOffer[];
  tenantSlug: string;
}

export default function VoyagesClient({ offers }: VoyagesClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editOffer, setEditOffer] = useState<SerializedOffer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SerializedOffer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return offers.filter((o) => {
      const q = search.toLowerCase();
      const matchSearch = !q || o.titleFr.toLowerCase().includes(q);
      const matchType = typeFilter === "ALL" || o.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [offers, search, typeFilter]);

  function openCreate() {
    setEditOffer(null);
    setShowModal(true);
  }

  function openEdit(o: SerializedOffer) {
    setEditOffer(o);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditOffer(null);
  }

  function onSaved() {
    closeModal();
    router.refresh();
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/agency-admin/voyages/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error ?? "Erreur lors de la suppression");
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setDeleteError("Erreur réseau");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5 w-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher par nom de voyage..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
          />
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-600 cursor-pointer transition"
        >
          <option value="ALL">Tous types</option>
          <option value="HAJJ">Hajj</option>
          <option value="UMRAH">Umrah</option>
        </select>

        {/* Create button */}
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#0f5132] hover:bg-[#0d4429] text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          + Créer un Voyage
        </button>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <EmptyState hasFilter={!!search || typeFilter !== "ALL"} onAdd={openCreate} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">
                    Nom du Voyage
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-3">
                    Dates &amp; Durée
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-3">
                    Capacité / Reste
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-3">
                    Tarif Forfaitaire
                  </th>
                  <th className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((offer) => (
                  <VoyageRowWithPanel
                    key={offer.id}
                    offer={offer}
                    expanded={expandedId === offer.id}
                    onToggleExpand={() => toggleExpand(offer.id)}
                    onEdit={() => openEdit(offer)}
                    onDelete={() => {
                      setDeleteTarget(offer);
                      setDeleteError("");
                    }}
                    onPilgrimChanged={() => router.refresh()}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-gray-400 text-xs">
              {filtered.length} voyage{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
            </p>
            <p className="text-gray-300 text-xs">{offers.length} total</p>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <CreateVoyageModal
          offer={editOffer}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Désactiver ce voyage ?</p>
                <p className="text-gray-400 text-xs mt-0.5">{deleteTarget.titleFr}</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-5">
              Ce voyage sera masqué de la liste. Les réservations existantes seront conservées.
            </p>
            {deleteError && (
              <p className="text-red-500 text-xs mb-3 bg-red-50 px-3 py-2 rounded-lg">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(""); }}
                className="flex-1 py-2 px-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 px-4 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition disabled:opacity-60"
              >
                {deleting ? "Suppression..." : "Désactiver"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VoyageRowWithPanel ────────────────────────────────────────────────────────

function VoyageRowWithPanel({
  offer,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onPilgrimChanged,
}: {
  offer: SerializedOffer;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPilgrimChanged: () => void;
}) {
  const isHajj = offer.type === "HAJJ";
  const badgeClass = isHajj ? "bg-[#0f5132]/10 text-[#0f5132]" : "bg-amber-50 text-amber-700";
  const badgeLabel = isHajj ? "Hajj" : "Umrah";
  const hasDates = !!offer.departureDate && !!offer.returnDate;
  const durationDays = hasDates ? getDurationDays(offer.departureDate!, offer.returnDate!) : null;
  const pct = offer.maxCapacity > 0 ? Math.min(100, (offer.confirmedCount / offer.maxCapacity) * 100) : 0;

  return (
    <>
      <tr className="hover:bg-gray-50/50 transition group border-b border-gray-50">
        {/* NOM DU VOYAGE */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#0f5132]/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#0f5132" strokeWidth={2}>
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <p className="text-gray-900 font-semibold text-sm leading-tight">{offer.titleFr}</p>
              <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                {badgeLabel}
              </span>
              {offer.provisional && (
                <span className="ml-1.5 inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                  Provisoire
                </span>
              )}
            </div>
          </div>
        </td>

        {/* DATES & DURÉE */}
        <td className="px-3 py-4">
          {hasDates ? (
            <div className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-gray-700 text-sm">
                  Du {formatDateFr(offer.departureDate!)} au {formatDateFr(offer.returnDate!)}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  ({durationDays} Jours de voyage)
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm italic">Dates non définies</p>
          )}
        </td>

        {/* CAPACITÉ / RESTE */}
        <td className="px-3 py-4">
          {offer.maxCapacity > 0 ? (
            <div className="min-w-[140px]">
              <div className="h-1 rounded-full bg-gray-100 overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full bg-[#0f5132] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {offer.confirmedCount} / {offer.maxCapacity} lits
              </p>
              <p className="text-xs text-gray-400">
                {offer.maxCapacity - offer.confirmedCount} places libres
              </p>
            </div>
          ) : (
            <p className="text-gray-300 text-xs italic">Capacité non définie</p>
          )}
        </td>

        {/* TARIF FORFAITAIRE */}
        <td className="px-3 py-4">
          <p className="text-gray-900 font-bold text-lg leading-tight">
            {formatPrice(offer.priceAdult)} {offer.currency}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">Tout compris (vols/hôtels)</p>
        </td>

        {/* ACTIONS */}
        <td className="px-3 py-4">
          <div className="flex items-center justify-center gap-1">
            {/* Pèlerins */}
            <button
              onClick={onToggleExpand}
              title="Gérer les pèlerins"
              className={`p-1.5 rounded transition flex items-center gap-1 text-xs font-medium ${
                expanded
                  ? "bg-[#0f5132]/10 text-[#0f5132]"
                  : "hover:bg-gray-100 text-gray-400 hover:text-[#0f5132]"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-[11px]">{offer.confirmedCount}</span>
            </button>
            <button
              onClick={onEdit}
              title="Modifier"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#0f5132] transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              title="Supprimer"
              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>

      {/* ── Panel pèlerins ── */}
      {expanded && (
        <tr>
          <td colSpan={5} className="px-0 py-0 bg-[#0f5132]/[0.02] border-b border-[#0f5132]/10">
            <PilgrimsPanel
              offer={offer}
              onChanged={onPilgrimChanged}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── PilgrimsPanel ────────────────────────────────────────────────────────────

function PilgrimsPanel({
  offer,
  onChanged,
}: {
  offer: SerializedOffer;
  onChanged: () => void;
}) {
  const [enrolled, setEnrolled] = useState<PilgrimBrief[]>([]);
  const [available, setAvailable] = useState<PilgrimBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [panelError, setPanelError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setPanelError("");
    try {
      const res = await fetch(`/api/agency-admin/voyages/${offer.id}/pilgrims`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEnrolled(data.enrolled ?? []);
      setAvailable(data.available ?? []);
    } catch {
      setPanelError("Erreur lors du chargement des pèlerins.");
    } finally {
      setLoading(false);
    }
  }, [offer.id]);

  // Charger au montage
  useEffect(() => { loadData(); }, [loadData]);

  const filteredAvailable = useMemo(() => {
    const q = pickerSearch.toLowerCase();
    return !q ? available : available.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.phone ?? "").includes(q)
    );
  }, [available, pickerSearch]);

  async function enroll(pilgrimId: string) {
    setEnrolling(pilgrimId);
    setPanelError("");
    try {
      const res = await fetch("/api/agency-admin/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pilgrimId, offerId: offer.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPanelError(d.error ?? "Erreur d'inscription");
        return;
      }
      await loadData();
      onChanged();
    } catch {
      setPanelError("Erreur réseau");
    } finally {
      setEnrolling(null);
    }
  }

  async function remove(reservationId: string) {
    setRemoving(reservationId);
    setPanelError("");
    try {
      const res = await fetch("/api/agency-admin/reservations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPanelError(d.error ?? "Erreur de suppression");
        return;
      }
      await loadData();
      onChanged();
    } catch {
      setPanelError("Erreur réseau");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="px-5 py-4">
      {/* Header du panel */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#0f5132]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">
            Pèlerins inscrits
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({enrolled.length}{offer.maxCapacity > 0 ? ` / ${offer.maxCapacity}` : ""})
            </span>
          </span>
        </div>
        <button
          onClick={() => { setShowPicker((p) => !p); setPickerSearch(""); }}
          disabled={offer.maxCapacity > 0 && enrolled.length >= offer.maxCapacity}
          className="flex items-center gap-1.5 text-xs font-semibold bg-[#0f5132] text-white px-3 py-1.5 rounded-lg hover:bg-[#0d4429] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Inscrire un pèlerin
        </button>
      </div>

      {panelError && (
        <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg mb-3">{panelError}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          Chargement...
        </div>
      ) : (
        <>
          {/* Liste des inscrits */}
          {enrolled.length === 0 ? (
            <p className="text-gray-400 text-sm italic py-2">Aucun pèlerin inscrit sur ce voyage.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
              {enrolled.map((p) => (
                <PilgrimCard
                  key={p.id}
                  pilgrim={p}
                  action="remove"
                  loading={removing === p.reservationId}
                  onAction={() => p.reservationId && remove(p.reservationId)}
                />
              ))}
            </div>
          )}

          {/* Picker d'ajout */}
          {showPicker && (
            <div className="border border-[#0f5132]/20 rounded-xl bg-white p-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Pèlerins disponibles ({available.length})
                </p>
                <button
                  onClick={() => setShowPicker(false)}
                  className="text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕ Fermer
                </button>
              </div>
              {available.length === 0 ? (
                <p className="text-gray-400 text-sm italic">Tous les pèlerins de cette saison sont déjà inscrits à un voyage.</p>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Rechercher un pèlerin..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
                  />
                  {filteredAvailable.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">Aucun résultat.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {filteredAvailable.map((p) => (
                        <PilgrimCard
                          key={p.id}
                          pilgrim={p}
                          action="add"
                          loading={enrolling === p.id}
                          onAction={() => enroll(p.id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── PilgrimCard ──────────────────────────────────────────────────────────────

function PilgrimCard({
  pilgrim,
  action,
  loading,
  onAction,
}: {
  pilgrim: PilgrimBrief;
  action: "add" | "remove";
  loading: boolean;
  onAction: () => void;
}) {
  const initials = pilgrim.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const st = STATUS_LABELS[pilgrim.pilgrimStatus] ?? STATUS_LABELS.PENDING;

  return (
    <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
      {pilgrim.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pilgrim.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-[#0f5132]/15 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-[#0f5132]">{initials}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{pilgrim.name}</p>
        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${st.cls}`}>
          {st.label}
        </span>
      </div>
      <button
        onClick={onAction}
        disabled={loading}
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition ${
          action === "add"
            ? "bg-[#0f5132]/10 hover:bg-[#0f5132] text-[#0f5132] hover:text-white"
            : "bg-red-50 hover:bg-red-500 text-red-400 hover:text-white"
        } disabled:opacity-40`}
        title={action === "add" ? "Inscrire" : "Retirer"}
      >
        {loading ? (
          <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83" />
          </svg>
        ) : action === "add" ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  hasFilter,
  onAdd,
}: {
  hasFilter: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 bg-[#0f5132]/10 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-[#0f5132]/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-gray-700 font-semibold text-base">
          {hasFilter ? "Aucun voyage ne correspond à votre recherche" : "Aucun voyage créé"}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          {hasFilter
            ? "Essayez de modifier vos critères de recherche"
            : "Commencez par créer votre premier forfait Hajj ou Umrah"}
        </p>
      </div>
      {!hasFilter && (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-[#0f5132] hover:bg-[#0d4429] text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          + Créer un Voyage
        </button>
      )}
    </div>
  );
}
