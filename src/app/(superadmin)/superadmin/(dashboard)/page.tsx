import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Dashboard" };

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: "Active",    cls: "bg-emerald-500/15 text-emerald-400" },
  TRIAL:     { label: "Essai",     cls: "bg-blue-500/15 text-blue-400" },
  SUSPENDED: { label: "Suspendue", cls: "bg-red-500/15 text-red-400" },
  CANCELLED: { label: "Annulée",   cls: "bg-gray-500/15 text-gray-400" },
};

const PLAN_MAP: Record<string, { label: string; cls: string }> = {
  STARTER:    { label: "Starter",    cls: "text-gray-400" },
  PRO:        { label: "Pro",        cls: "text-amber-400" },
  ENTERPRISE: { label: "Enterprise", cls: "text-purple-400" },
};

function formatDate(d: Date) {
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

async function getStats() {
  const [totalTenants, activeTenants, totalUsers, totalReservations, recentTenants] = await Promise.all([
    prisma.tenant.count({ where: { status: { not: "PLATFORM" } } }),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: { not: "SUPER_ADMIN" }, active: true } }),
    prisma.reservation.count({ where: { status: "CONFIRMED" } }),
    prisma.tenant.findMany({
      where: { status: { not: "PLATFORM" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        _count: {
          select: {
            users: { where: { role: { not: "SUPER_ADMIN" }, active: true } },
            reservations: true,
          },
        },
      },
    }),
  ]);
  return { totalTenants, activeTenants, totalUsers, totalReservations, recentTenants };
}

export default async function SuperAdminDashboard() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Vue globale de la plateforme Hajj</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Agences enregistrées" value={stats.totalTenants} sub={`${stats.activeTenants} actives`} color="amber" icon={<AgencyIcon />} />
        <StatCard label="Utilisateurs actifs"  value={stats.totalUsers}   sub="Admins & agents"            color="blue"  icon={<UsersIcon />} />
        <StatCard label="Réservations conf."   value={stats.totalReservations} sub="Total plateforme"      color="green" icon={<BookIcon />} />
        <StatCard label="Revenus MRR"          value="—"                  sub="Bientôt disponible"          color="purple" icon={<MoneyIcon />} />
      </div>

      {/* Agences récentes */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">Agences récentes</h2>
          <Link
            href="/superadmin/tenants"
            className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
          >
            Voir toutes →
          </Link>
        </div>

        {stats.recentTenants.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-gray-500 text-sm">Aucune agence encore créée.</p>
            <Link
              href="/superadmin/tenants"
              className="inline-flex items-center gap-2 mt-4 bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
            >
              + Créer une agence
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-6 py-3">Agence</th>
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">Plan</th>
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">Statut</th>
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">Utilisateurs</th>
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">Réservations</th>
                  <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-3">Créée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {stats.recentTenants.map((t) => {
                  const status = STATUS_MAP[t.status] ?? STATUS_MAP.ACTIVE;
                  const plan   = PLAN_MAP[t.plan]     ?? PLAN_MAP.STARTER;
                  return (
                    <tr key={t.id} className="hover:bg-gray-750/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-white font-medium text-sm">{t.name}</p>
                        <p className="text-gray-500 text-xs">/{t.slug}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-semibold ${plan.cls}`}>{plan.label}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-300 text-sm">{t._count.users}</td>
                      <td className="px-4 py-4 text-gray-300 text-sm">{t._count.reservations}</td>
                      <td className="px-4 py-4 text-gray-400 text-sm whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composants ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon,
}: {
  label: string; value: string | number; sub: string; color: string; icon: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    amber:  "bg-amber-500/10 text-amber-400",
    blue:   "bg-blue-500/10 text-blue-400",
    green:  "bg-emerald-500/10 text-emerald-400",
    purple: "bg-purple-500/10 text-purple-400",
  };
  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
      <div className="flex items-start justify-between mb-4">
        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-white text-3xl font-bold">{value}</p>
      <p className="text-gray-500 text-xs mt-1">{sub}</p>
    </div>
  );
}

function AgencyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}
function MoneyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
