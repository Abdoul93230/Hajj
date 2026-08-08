"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CreateTenantModal from "./CreateTenantModal";

type Tenant = {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  country: string;
  plan: string;
  status: string;
  createdAt: string;
  _count: { users: number; reservations: number };
};

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: "Active",    cls: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" },
  TRIAL:     { label: "Essai",     cls: "bg-blue-500/15 text-blue-400 border border-blue-500/30" },
  SUSPENDED: { label: "Suspendue", cls: "bg-red-500/15 text-red-400 border border-red-500/30" },
  CANCELLED: { label: "Annulée",   cls: "bg-gray-500/15 text-gray-400 border border-gray-500/30" },
};

const PLAN_MAP: Record<string, { cls: string }> = {
  STARTER:    { cls: "bg-gray-700 text-gray-300" },
  PRO:        { cls: "bg-amber-500/15 text-amber-400" },
  ENTERPRISE: { cls: "bg-purple-500/15 text-purple-400" },
};

const COUNTRY_MAP: Record<string, string> = {
  NE: "🇳🇪 Niger",
  ML: "🇲🇱 Mali",
  SN: "🇸🇳 Sénégal",
  GN: "🇬🇳 Guinée",
  CI: "🇨🇮 Côte d'Ivoire",
  BF: "🇧🇫 Burkina Faso",
  MR: "🇲🇷 Mauritanie",
  GM: "🇬🇲 Gambie",
  GW: "🇬🇼 Guinée-Bissau",
  SL: "🇸🇱 Sierra Leone",
  LR: "🇱🇷 Liberia",
  MA: "🇲🇦 Maroc",
  TN: "🇹🇳 Tunisie",
  DZ: "🇩🇿 Algérie",
  CM: "🇨🇲 Cameroun",
  TG: "🇹🇬 Togo",
  BJ: "🇧🇯 Bénin",
  TD: "🇹🇩 Tchad",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function AvatarBadge({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = ["bg-amber-500", "bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-rose-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-gray-900 font-bold text-sm flex-shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

export default function TenantsClient({ initialTenants }: { initialTenants: Tenant[] }) {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPlan, setFilterPlan] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tenant | null>(null);

  const filtered = tenants.filter((t) => {
    if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
    if (filterPlan !== "ALL" && t.plan !== filterPlan) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !t.slug.toLowerCase().includes(q) && !t.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  async function toggleStatus(tenant: Tenant) {
    const newStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setChangingStatus(tenant.id);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTenants((prev) => prev.map((t) => t.id === tenant.id ? { ...t, status: newStatus } : t));
      }
    } finally {
      setChangingStatus(null);
    }
  }

  async function changePlan(tenant: Tenant, plan: string) {
    const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      setTenants((prev) => prev.map((t) => t.id === tenant.id ? { ...t, plan } : t));
    }
  }

  async function deleteTenant(tenant: Tenant) {
    const res = await fetch(`/api/superadmin/tenants/${tenant.id}`, { method: "DELETE" });
    if (res.ok) {
      setTenants((prev) => prev.map((t) => t.id === tenant.id ? { ...t, status: "CANCELLED" } : t));
      setConfirmDelete(null);
    }
  }

  function onCreated(tenant: Record<string, unknown>) {
    setTenants((prev) => [tenant as unknown as Tenant, ...prev]);
    setShowCreate(false);
    router.refresh();
  }

  const countByStatus = tenants.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestion des Agences</h1>
          <p className="text-gray-400 text-sm mt-1">
            {tenants.length} agence{tenants.length !== 1 ? "s" : ""} enregistrée{tenants.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <PlusIcon />
          Nouvelle agence
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Actives",    val: countByStatus.ACTIVE    ?? 0, cls: "text-emerald-400" },
          { label: "Essai",      val: countByStatus.TRIAL     ?? 0, cls: "text-blue-400" },
          { label: "Suspendues", val: countByStatus.SUSPENDED ?? 0, cls: "text-red-400" },
          { label: "Total",      val: tenants.length,               cls: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
            <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une agence…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl pl-9 pr-4 py-2.5 placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIAL">Essai</option>
          <option value="SUSPENDED">Suspendue</option>
          <option value="CANCELLED">Annulée</option>
        </select>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
        >
          <option value="ALL">Tous les plans</option>
          <option value="STARTER">Starter</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wider px-5 py-3.5">Agence</th>
                <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wider px-4 py-3.5">Pays</th>
                <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wider px-4 py-3.5">Plan</th>
                <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wider px-4 py-3.5">Statut</th>
                <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wider px-4 py-3.5">Utilisateurs</th>
                <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wider px-4 py-3.5">Réservations</th>
                <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wider px-4 py-3.5">Créée le</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-500 text-sm py-12">
                    Aucune agence trouvée
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const statusInfo = STATUS_MAP[t.status] ?? STATUS_MAP.ACTIVE;
                  const planInfo = PLAN_MAP[t.plan] ?? PLAN_MAP.STARTER;
                  return (
                    <tr key={t.id} className="hover:bg-gray-750 transition-colors group">
                      {/* Agence */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarBadge name={t.name} />
                          <div>
                            <p className="text-white font-medium text-sm">{t.name}</p>
                            <p className="text-gray-500 text-xs">/{t.slug} · {t.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Pays */}
                      <td className="px-4 py-4 text-gray-300 text-sm">
                        {COUNTRY_MAP[t.country] ?? t.country}
                      </td>
                      {/* Plan */}
                      <td className="px-4 py-4">
                        <select
                          value={t.plan}
                          onChange={(e) => changePlan(t, e.target.value)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border-0 cursor-pointer focus:outline-none ${planInfo.cls}`}
                        >
                          {Object.entries(PLAN_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                      {/* Statut */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      {/* Utilisateurs */}
                      <td className="px-4 py-4 text-gray-300 text-sm">
                        {t._count.users}
                      </td>
                      {/* Réservations */}
                      <td className="px-4 py-4 text-gray-300 text-sm">
                        {t._count.reservations}
                      </td>
                      {/* Date */}
                      <td className="px-4 py-4 text-gray-400 text-sm whitespace-nowrap">
                        {formatDate(t.createdAt)}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Inspecter */}
                          <Link
                            href={`/superadmin/tenants/${t.id}`}
                            title="Inspecter"
                            className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 flex items-center justify-center transition-colors"
                          >
                            <EyeIcon />
                          </Link>
                          {/* Toggle actif/suspendu */}
                          <button
                            onClick={() => toggleStatus(t)}
                            disabled={changingStatus === t.id || t.status === "CANCELLED"}
                            title={t.status === "ACTIVE" ? "Suspendre" : "Réactiver"}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${
                              t.status === "ACTIVE"
                                ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                                : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                            }`}
                          >
                            {t.status === "ACTIVE" ? <PauseIcon /> : <PlayIcon />}
                          </button>
                          {/* Supprimer */}
                          <button
                            onClick={() => setConfirmDelete(t)}
                            disabled={t.status === "CANCELLED"}
                            title="Supprimer"
                            className="w-8 h-8 rounded-lg bg-gray-700 text-gray-400 hover:bg-red-500/15 hover:text-red-400 flex items-center justify-center transition-colors disabled:opacity-40"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal création */}
      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={onCreated}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold text-lg mb-2">Supprimer l&apos;agence ?</h3>
            <p className="text-gray-400 text-sm mb-6">
              <span className="text-white font-medium">{confirmDelete.name}</span> sera marquée comme annulée.
              Les données seront conservées.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteTenant(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Icônes ────────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
