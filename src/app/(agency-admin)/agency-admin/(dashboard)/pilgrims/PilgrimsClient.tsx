"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AddPilgrimModal from "./AddPilgrimModal";

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
};

export type SerializedReservation = {
  id: string;
  tenantId: string;
  userId: string | null;
  offerId: string;
  category: string;
  status: string;
  deposit: number | null;
  totalAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  offer: SerializedOffer;
};

export type SerializedPilgrim = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  phone: string | null;
  password: string;
  role: string;
  permissions: string[];
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  gender: string | null;
  birthDate: string | null;
  city: string | null;
  country: string | null;
  address: string | null;
  profession: string | null;
  photoUrl: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  hasPassport: boolean;
  hasCni: boolean;
  hasVaccine: boolean;
  pilgrimStatus: string;
  reservations: SerializedReservation[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#0f5132",
  "#1e40af",
  "#7c3aed",
  "#c2410c",
  "#be185d",
  "#0e7490",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
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

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " " + currency;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "text-gray-400" },
  INCOMPLETE: { label: "Incomplet", className: "text-orange-500" },
  REGISTERED: { label: "Inscrit", className: "text-blue-600" },
  VISA_OK: { label: "Visa OK", className: "text-[#0f5132] font-semibold" },
};

function getPilgrimStatusDisplay(status: string) {
  return STATUS_MAP[status] ?? { label: status, className: "text-gray-400" };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PilgrimsClientProps {
  pilgrims: SerializedPilgrim[];
  offers: SerializedOffer[];
  selectedYear: number;
  tenantSlug: string;
}

export default function PilgrimsClient({
  pilgrims,
  offers,
  selectedYear,
}: PilgrimsClientProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editPilgrim, setEditPilgrim] = useState<SerializedPilgrim | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SerializedPilgrim | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const today = new Date();
  const dateLabel = today.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const filtered = useMemo(() => {
    return pilgrims.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.city ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q) ||
        (p.country ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "ALL" || p.pilgrimStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [pilgrims, search, statusFilter]);

  function openAddModal() {
    setEditPilgrim(null);
    setShowModal(true);
  }

  function openEditModal(p: SerializedPilgrim) {
    setEditPilgrim(p);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditPilgrim(null);
  }

  function onSaved() {
    closeModal();
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/agency-admin/pilgrims/${deleteTarget.id}`, {
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
            placeholder="Rechercher par nom, ville, téléphone, pays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] placeholder:text-gray-300 transition"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 px-3 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0f5132]/30 focus:border-[#0f5132] text-gray-600 cursor-pointer transition"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="INCOMPLETE">Incomplet</option>
          <option value="REGISTERED">Inscrit</option>
          <option value="VISA_OK">Visa OK</option>
        </select>

        {/* Add button */}
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[#0f5132] hover:bg-[#0d4429] text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un Pèlerin
        </button>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <EmptyState hasFilter={!!search || statusFilter !== "ALL"} onAdd={openAddModal} />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-5 py-3">
                    Pèlerin
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-3">
                    Contact & Adresse
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-3">
                    Voyage Associé
                  </th>
                  <th className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-3">
                    Documents Requis
                  </th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-3">
                    Statut
                  </th>
                  <th className="text-center text-[10px] font-bold uppercase tracking-wider text-gray-400 px-3 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((pilgrim) => (
                  <PilgrimRow
                    key={pilgrim.id}
                    pilgrim={pilgrim}
                    onEdit={() => openEditModal(pilgrim)}
                    onDelete={() => {
                      setDeleteTarget(pilgrim);
                      setDeleteError("");
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
            <p className="text-gray-400 text-xs">
              {filtered.length} pèlerin{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}
            </p>
            <p className="text-gray-300 text-xs">{pilgrims.length} total</p>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <AddPilgrimModal
          pilgrim={editPilgrim}
          offers={offers}
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
                <p className="font-bold text-gray-800 text-sm">Supprimer ce pèlerin ?</p>
                <p className="text-gray-400 text-xs mt-0.5">{deleteTarget.name}</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-5">
              Cette action désactivera le compte du pèlerin. Ses données seront conservées.
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
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PilgrimRow ───────────────────────────────────────────────────────────────

function PilgrimRow({
  pilgrim,
  onEdit,
  onDelete,
}: {
  pilgrim: SerializedPilgrim;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const avatarColor = getAvatarColor(pilgrim.name);
  const initials = getInitials(pilgrim.name);
  const age = getAge(pilgrim.birthDate);
  const statusDisplay = getPilgrimStatusDisplay(pilgrim.pilgrimStatus);
  const latestReservation = pilgrim.reservations[0] ?? null;

  const genderLabel =
    pilgrim.gender === "M" || pilgrim.gender === "Masculin"
      ? "Homme"
      : pilgrim.gender === "F" || pilgrim.gender === "Féminin"
      ? "Femme"
      : null;

  return (
    <tr className="hover:bg-gray-50/60 transition group">
      {/* PÈLERIN */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
            style={{ backgroundColor: avatarColor }}
          >
            {pilgrim.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pilgrim.photoUrl} alt={pilgrim.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-gray-800 font-semibold text-sm leading-tight">{pilgrim.name}</p>
            <p className="text-gray-400 text-[11px] mt-0.5">
              {[genderLabel, age !== null ? `${age} ans` : null].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
        </div>
      </td>

      {/* CONTACT & ADRESSE */}
      <td className="px-3 py-4">
        <p className="text-gray-700 text-sm font-medium">{pilgrim.phone ?? "—"}</p>
        <p className="text-gray-400 text-[11px] mt-0.5">
          {[pilgrim.city, pilgrim.country].filter(Boolean).join(", ") || "—"}
        </p>
      </td>

      {/* VOYAGE */}
      <td className="px-3 py-4">
        {latestReservation ? (
          <div>
            <p className="text-gray-700 text-sm font-medium leading-tight">
              {latestReservation.offer.titleFr}
            </p>
            <p className="text-gray-400 text-[11px] mt-0.5">
              Forfait: {formatPrice(latestReservation.offer.priceAdult, latestReservation.offer.currency)}
            </p>
          </div>
        ) : (
          <span className="text-gray-300 text-sm">—</span>
        )}
      </td>

      {/* DOCUMENTS */}
      <td className="px-3 py-4">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <DocBadge label="PASS" active={pilgrim.hasPassport} />
          <DocBadge label="CNI" active={pilgrim.hasCni} />
          <DocBadge label="VAC" active={pilgrim.hasVaccine} />
        </div>
      </td>

      {/* STATUT */}
      <td className="px-3 py-4">
        <span className={`text-sm font-medium ${statusDisplay.className}`}>
          {statusDisplay.label}
        </span>
      </td>

      {/* ACTIONS */}
      <td className="px-3 py-4">
        <div className="flex items-center justify-center gap-1">
          {/* Document (placeholder) */}
          <ActionBtn title="Documents" color="text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </ActionBtn>

          {/* Print (placeholder) */}
          <ActionBtn title="Imprimer" color="text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </ActionBtn>

          {/* Check (placeholder) */}
          <ActionBtn title="Valider" color="text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </ActionBtn>

          {/* View (placeholder) */}
          <ActionBtn title="Voir" color="text-gray-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </ActionBtn>

          {/* Edit */}
          <button
            onClick={onEdit}
            title="Modifier"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#0f5132] hover:bg-[#0f5132]/10 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            title="Supprimer"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      className={`w-7 h-7 rounded-lg flex items-center justify-center ${color} hover:bg-gray-100 transition`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        {children}
      </svg>
    </button>
  );
}

function DocBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
        active
          ? "bg-[#0f5132] text-white"
          : "bg-gray-100 text-gray-400"
      }`}
    >
      {label}
    </span>
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-gray-700 font-semibold text-base">
          {hasFilter ? "Aucun pèlerin ne correspond à votre recherche" : "Aucun pèlerin enregistré"}
        </p>
        <p className="text-gray-400 text-sm mt-1">
          {hasFilter
            ? "Essayez de modifier vos critères de recherche"
            : "Commencez par ajouter votre premier pèlerin"}
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
          Ajouter un Pèlerin
        </button>
      )}
    </div>
  );
}
