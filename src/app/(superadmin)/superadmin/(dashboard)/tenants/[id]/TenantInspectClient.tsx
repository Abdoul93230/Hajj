"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Pilgrim = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  pilgrimStatus: string;
  hasPassport: boolean;
  hasCni: boolean;
  hasVaccine: boolean;
  createdAt: string;
};

type Offer = {
  id: string;
  titleFr: string;
  type: string;
  priceAdult: number;
  departureDate: string | null;
  returnDate: string | null;
  confirmedCount: number;
  data: { maxCapacity?: number } | null;
};

type Props = {
  tenant: {
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
    _count: { users: number; reservations: number; offers: number };
    theme: Record<string, string> | null;
  };
  year: number;
  availableYears: number[];
  stats: {
    pilgrimsThisYear: number;
    confirmedThisYear: number;
    pendingThisYear: number;
    cancelledThisYear: number;
    offersThisYear: number;
    totalRevenue: number;
  };
  pilgrimsByStatus: { status: string; count: number }[];
  recentPilgrims: Pilgrim[];
  recentOffers: Offer[];
};

const STATUS_PILGRIM: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: "En attente",  cls: "bg-gray-700 text-gray-300" },
  INCOMPLETE: { label: "Incomplet",   cls: "bg-orange-500/15 text-orange-400" },
  REGISTERED: { label: "Inscrit",     cls: "bg-blue-500/15 text-blue-400" },
  VISA_OK:    { label: "Visa OK",     cls: "bg-emerald-500/15 text-emerald-400" },
};

const PLAN_MAP: Record<string, { label: string; cls: string }> = {
  STARTER:    { label: "Starter",    cls: "bg-gray-700 text-gray-300" },
  PRO:        { label: "Pro",        cls: "bg-amber-500/15 text-amber-400" },
  ENTERPRISE: { label: "Enterprise", cls: "bg-purple-500/15 text-purple-400" },
};

const COUNTRY_FLAG: Record<string, string> = {
  NE: "🇳🇪", ML: "🇲🇱", SN: "🇸🇳", GN: "🇬🇳", CI: "🇨🇮",
  BF: "🇧🇫", MR: "🇲🇷", MA: "🇲🇦", TN: "🇹🇳", DZ: "🇩🇿",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

function DocBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ok ? "bg-emerald-500/15 text-emerald-400" : "bg-gray-700 text-gray-500 line-through"}`}>
      {label}
    </span>
  );
}

export default function TenantInspectClient({
  tenant, year, availableYears, stats, pilgrimsByStatus, recentPilgrims, recentOffers,
}: Props) {
  const router = useRouter();
  const plan = PLAN_MAP[tenant.plan] ?? PLAN_MAP.STARTER;

  function changeYear(y: number) {
    router.push(`/superadmin/tenants/${tenant.id}?year=${y}`);
  }

  const totalPilgrimStatuses = pilgrimsByStatus.reduce((s, g) => s + g.count, 0);

  return (
    <div className="space-y-6">

      {/* Breadcrumb + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/superadmin/tenants" className="text-gray-400 hover:text-white transition-colors">
            Agences
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-white font-medium">{tenant.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Sélecteur d'année */}
          <select
            value={year}
            onChange={(e) => changeYear(parseInt(e.target.value, 10))}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                Saison {y}{y === new Date().getFullYear() ? " (en cours)" : ""}
              </option>
            ))}
          </select>
          <Link
            href="/superadmin/tenants"
            className="text-sm text-gray-400 hover:text-white bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 transition-colors"
          >
            ← Retour
          </Link>
        </div>
      </div>

      {/* Fiche agence */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center text-gray-900 font-black text-xl flex-shrink-0">
            {tenant.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-white text-xl font-bold">{tenant.name}</h1>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.cls}`}>{plan.label}</span>
              {tenant.status === "SUSPENDED" && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Suspendue</span>
              )}
            </div>
            <p className="text-gray-400 text-sm">/{tenant.slug} · {tenant.email}</p>
            {tenant.phone && <p className="text-gray-500 text-sm mt-0.5">{tenant.phone}</p>}
            {tenant.address && <p className="text-gray-500 text-sm">{tenant.address}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-gray-500 text-xs">Membre depuis</p>
            <p className="text-gray-300 text-sm font-medium">{formatDate(tenant.createdAt)}</p>
            <p className="text-3xl mt-2">{COUNTRY_FLAG[tenant.country] ?? "🌍"}</p>
          </div>
        </div>

        {/* Totaux cumulés */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-gray-700">
          <div className="text-center">
            <p className="text-white text-2xl font-bold">{tenant._count.users}</p>
            <p className="text-gray-400 text-xs mt-0.5">Utilisateurs actifs (total)</p>
          </div>
          <div className="text-center">
            <p className="text-white text-2xl font-bold">{tenant._count.reservations}</p>
            <p className="text-gray-400 text-xs mt-0.5">Réservations (total)</p>
          </div>
          <div className="text-center">
            <p className="text-white text-2xl font-bold">{tenant._count.offers}</p>
            <p className="text-gray-400 text-xs mt-0.5">Voyages actifs (total)</p>
          </div>
        </div>
      </div>

      {/* Stats saison */}
      <div>
        <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">
          Saison {year}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Pèlerins inscrits", value: stats.pilgrimsThisYear,    cls: "text-amber-400" },
            { label: "Réservations conf.", value: stats.confirmedThisYear,   cls: "text-emerald-400" },
            { label: "En attente",         value: stats.pendingThisYear,     cls: "text-blue-400" },
            { label: "Annulées",           value: stats.cancelledThisYear,   cls: "text-red-400" },
            { label: "Voyages créés",      value: stats.offersThisYear,      cls: "text-purple-400" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recette + répartition statuts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Recette */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Recettes confirmées {year}
            </p>
            <p className="text-white text-3xl font-bold">{formatAmount(stats.totalRevenue)}</p>
            <p className="text-gray-500 text-xs mt-1">Basé sur les réservations CONFIRMED</p>
          </div>

          {/* Répartition statuts pèlerins */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Statuts pèlerins {year}
            </p>
            {totalPilgrimStatuses === 0 ? (
              <p className="text-gray-600 text-sm">Aucun pèlerin cette saison</p>
            ) : (
              <div className="space-y-2">
                {pilgrimsByStatus.map((g) => {
                  const s = STATUS_PILGRIM[g.status] ?? STATUS_PILGRIM.PENDING;
                  const pct = Math.round((g.count / totalPilgrimStatuses) * 100);
                  return (
                    <div key={g.status} className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full w-24 text-center flex-shrink-0 ${s.cls}`}>
                        {s.label}
                      </span>
                      <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                        <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-gray-300 text-xs w-6 text-right">{g.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pèlerins récents */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold text-sm">
            Pèlerins inscrits — Saison {year}
            <span className="text-gray-500 font-normal ml-2">({recentPilgrims.length} affichés)</span>
          </h2>
        </div>
        {recentPilgrims.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">Aucun pèlerin cette saison</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase px-5 py-3">Pèlerin</th>
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase px-4 py-3">Statut</th>
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase px-4 py-3">Documents</th>
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase px-4 py-3">Inscrit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {recentPilgrims.map((p) => {
                  const st = STATUS_PILGRIM[p.pilgrimStatus] ?? STATUS_PILGRIM.PENDING;
                  const initials = p.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={p.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{p.name}</p>
                            <p className="text-gray-500 text-xs">{[p.city, p.country].filter(Boolean).join(", ") || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <DocBadge ok={p.hasPassport} label="PASS" />
                          <DocBadge ok={p.hasCni} label="CNI" />
                          <DocBadge ok={p.hasVaccine} label="VAC" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(p.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Voyages */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold text-sm">
            Voyages — Saison {year}
            <span className="text-gray-500 font-normal ml-2">({recentOffers.length} affichés)</span>
          </h2>
        </div>
        {recentOffers.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">Aucun voyage cette saison</p>
        ) : (
          <div className="divide-y divide-gray-700/40">
            {recentOffers.map((o) => {
              const max = o.data?.maxCapacity ?? 0;
              const pct = max > 0 ? Math.min(100, Math.round((o.confirmedCount / max) * 100)) : 0;
              return (
                <div key={o.id} className="px-5 py-4 flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${o.type === "HAJJ" ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{o.titleFr}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {formatDate(o.departureDate)} → {formatDate(o.returnDate)}
                    </p>
                    {max > 0 && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 bg-gray-700 rounded-full h-1">
                          <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-gray-400 text-xs flex-shrink-0">{o.confirmedCount}/{max}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white text-sm font-bold">{formatAmount(o.priceAdult)}</p>
                    <span className={`text-xs font-semibold ${o.type === "HAJJ" ? "text-emerald-400" : "text-amber-400"}`}>
                      {o.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
