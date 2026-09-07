import type { Metadata } from "next";
import { headers, cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Tableau de bord" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const OFFER_TYPE_FR: Record<string, string> = {
  HAJJ: "Hajj", OMRA: "Oumra", OMRA_RAMADAN: "Oumra Ramadan",
  COMBINED: "Hajj + Oumra", OTHER: "Autre",
};

function fmtAmount(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " " + currency;
}

async function getStats(tenantId: string, year: number) {
  const from = new Date(year, 0, 1);
  const to   = new Date(year + 1, 0, 1);
  const yf   = { gte: from, lt: to };

  const [
    pilgrims, visaOk, voyages, dossiersPending,
    payments, reservations, reservationsWithOffer,
  ] = await Promise.all([
    prisma.user.count({ where: { tenantId, role: "PILGRIM", createdAt: yf } }),
    prisma.user.count({ where: { tenantId, role: "PILGRIM", pilgrimStatus: "VISA_OK", createdAt: yf } }),
    prisma.offer.count({ where: { tenantId, active: true, departureDate: yf } }),
    prisma.user.count({ where: { tenantId, role: "PILGRIM", createdAt: yf, pilgrimStatus: { in: ["NOUVEAU", "EN_COURS", "PENDING", "INCOMPLETE"] } } }),
    db.payment.findMany({
      where: {
        tenantId,
        status: "COMPLETED",
        reservation: { createdAt: yf },
      },
      select: { amount: true, type: true },
    }),
    prisma.reservation.findMany({
      where: { tenantId, createdAt: yf },
      select: {
        totalAmount: true,
        offer: { select: { priceAdult: true, currency: true } },
      },
    }),
    prisma.reservation.findMany({
      where: { tenantId, createdAt: yf },
      select: {
        offerId: true,
        offer: { select: { titleFr: true, type: true, departureDate: true } },
      },
    }),
  ]);

  // Finances
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalIn     = payments.filter((p: any) => p.type !== "REFUND").reduce((s: number, p: any) => s + p.amount, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRefund = payments.filter((p: any) => p.type === "REFUND").reduce((s: number, p: any) => s + p.amount, 0);
  const netIn       = totalIn - totalRefund;
  const totalDue    = reservations.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: number, r: any) => s + (r.totalAmount ?? r.offer.priceAdult ?? 0), 0
  );
  const remaining   = Math.max(0, totalDue - netIn);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currency    = (reservations as any[])[0]?.offer.currency ?? "FCFA";

  // Inscriptions par forfait
  const offerMap: Record<string, { title: string; type: string; date: string | null; count: number }> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of reservationsWithOffer as any[]) {
    if (!offerMap[r.offerId]) {
      offerMap[r.offerId] = {
        title: r.offer.titleFr,
        type:  r.offer.type,
        date:  r.offer.departureDate ? new Date(r.offer.departureDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null,
        count: 0,
      };
    }
    offerMap[r.offerId].count++;
  }
  const offerGroups = Object.values(offerMap).sort((a, b) => b.count - a.count);

  return {
    pilgrims, visaOk, voyages, dossiersPending,
    totalIn, totalRefund, netIn, remaining, totalDue, currency,
    offerGroups,
    nbReservations: reservations.length,
  };
}

export default async function AgencyDashboard() {
  const headersList = await headers();
  const tenantSlug  = headersList.get("x-tenant-slug") ?? "";

  const tenant = tenantSlug
    ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    : null;

  const currentYear = new Date().getFullYear();
  const cookieStore = await cookies();
  const cookieYear  = cookieStore.get("zam_selected_year")?.value;
  const parsed      = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const minYear     = tenant ? tenant.createdAt.getFullYear() : currentYear;
  const selectedYear =
    !isNaN(parsed) && parsed >= minYear && parsed <= currentYear ? parsed : currentYear;

  const stats         = tenant ? await getStats(tenant.id, selectedYear) : null;
  const isCurrentYear = selectedYear === currentYear;

  return (
    <div className="space-y-6 w-full">

      {/* ── Banner ── */}
      <div className="relative bg-[#0f2419] rounded-2xl px-8 py-7 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #d4af37 0%, transparent 60%)" }} />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-white/10 text-[#d4af37] text-xs font-semibold px-3 py-1 rounded-full mb-3">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Vue d&apos;ensemble — Saison {selectedYear}
            </span>
            <p className="text-white text-xl font-bold leading-snug">
              Qu&apos;Allah facilite les démarches de vos futurs pèlerins&nbsp;!
            </p>
            <p className="text-white/60 text-sm mt-2 max-w-2xl">
              Bienvenue dans <span className="text-[#d4af37] font-semibold">{tenant?.name ?? "ZAM Hajj & Oumra"}</span>.
              Suivez les dossiers, réservations et la situation financière de votre agence.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="bg-[#d4af37]/15 border border-[#d4af37]/30 rounded-xl px-4 py-3 text-center">
              <p className="text-[#d4af37]/70 text-[9px] font-bold uppercase tracking-widest">Saison</p>
              <p className="text-[#d4af37] text-2xl font-black leading-tight">{selectedYear}</p>
              {isCurrentYear && (
                <p className="text-[#d4af37]/60 text-[9px] font-semibold uppercase tracking-wide mt-0.5">En cours</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pèlerins inscrits"
            value={stats.pilgrims}
            sub={`${stats.nbReservations} réservation${stats.nbReservations > 1 ? "s" : ""} saison ${selectedYear}`}
            subColor="text-emerald-500"
            icon={<PilgrimsIcon />}
            iconBg="bg-emerald-50"
            href="/agency-admin/pilgrims"
          />
          <StatCard
            label="Visas accordés"
            value={stats.visaOk}
            sub={stats.pilgrims > 0 ? `${Math.round((stats.visaOk / stats.pilgrims) * 100)}% des dossiers` : "Aucun dossier"}
            subColor="text-amber-500"
            icon={<VisaIcon />}
            iconBg="bg-amber-50"
            href="/agency-admin/pilgrims"
          />
          <StatCard
            label="Voyages saison"
            value={stats.voyages}
            sub={`Départs en ${selectedYear}`}
            subColor="text-blue-500"
            icon={<FlightIcon />}
            iconBg="bg-blue-50"
            href="/agency-admin/voyages"
          />
          <StatCard
            label="Dossiers à traiter"
            value={stats.dossiersPending}
            sub={stats.dossiersPending > 0 ? "En attente / incomplets" : "Tous à jour ✓"}
            subColor={stats.dossiersPending > 0 ? "text-red-500" : "text-emerald-500"}
            icon={<AlertIcon />}
            iconBg="bg-red-50"
            href="/agency-admin/pilgrims"
          />
        </div>
      )}

      {/* ── Finances ── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FinanceCard
            label="ENCAISSEMENTS"
            title="Total des paiements reçus"
            value={fmtAmount(stats.totalIn, stats.currency)}
            sub={`Remboursements : ${fmtAmount(stats.totalRefund, stats.currency)}`}
            net={`Net encaissé : ${fmtAmount(stats.netIn, stats.currency)}`}
            bg="bg-[#0f5132]"
            accent="#d4af37"
            href="/agency-admin/payments"
          />
          <FinanceCard
            label="TOTAL DÛ"
            title="Montant total des forfaits saison"
            value={fmtAmount(stats.totalDue, stats.currency)}
            sub={`${stats.nbReservations} réservation${stats.nbReservations !== 1 ? "s" : ""}`}
            net={`Collecté : ${fmtAmount(stats.netIn, stats.currency)}`}
            bg="bg-[#1a2f5e]"
            accent="#60a5fa"
            href="/agency-admin/payments"
          />
          <FinanceCard
            label="SOLDES DÉBITEURS"
            title="Restes à recouvrer"
            value={fmtAmount(stats.remaining, stats.currency)}
            sub={stats.remaining === 0 ? "Tout est soldé ✓" : "Paiements en attente"}
            net={`Taux de collecte : ${stats.totalDue > 0 ? Math.round((stats.netIn / stats.totalDue) * 100) : 0}%`}
            bg="bg-[#7c4a00]"
            accent="#fbbf24"
            href="/agency-admin/payments"
          />
        </div>
      )}

      {/* ── Sections bas ── */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Inscriptions par forfait */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <p className="text-gray-500 text-[11px] font-bold tracking-wider uppercase">
                  Inscriptions par forfait
                </p>
              </div>
              <Link href="/agency-admin/voyages" className="text-xs text-emerald-600 font-semibold hover:underline">
                Voir tout →
              </Link>
            </div>
            {stats.offerGroups.length === 0 ? (
              <p className="text-gray-300 text-sm">Aucune inscription pour la saison {selectedYear}.</p>
            ) : (
              <div className="space-y-2">
                {stats.offerGroups.map((g, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{g.title}</p>
                      <p className="text-xs text-gray-400">
                        {OFFER_TYPE_FR[g.type] ?? g.type}
                        {g.date ? ` · Départ ${g.date}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Barre proportionnelle */}
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${Math.round((g.count / stats.pilgrims) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 w-6 text-right">{g.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bilan financier synthèse */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <p className="text-gray-500 text-[11px] font-bold tracking-wider uppercase">
                Bilan financier — Saison {selectedYear}
              </p>
            </div>
            {stats.totalDue === 0 ? (
              <p className="text-gray-300 text-sm">Aucune donnée financière pour cette saison.</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Montant total des forfaits", value: fmtAmount(stats.totalDue, stats.currency), color: "text-gray-800" },
                  { label: "Total encaissé",             value: fmtAmount(stats.totalIn, stats.currency),  color: "text-emerald-600" },
                  { label: "Remboursements",             value: `− ${fmtAmount(stats.totalRefund, stats.currency)}`, color: "text-red-500" },
                  { label: "Net collecté",               value: fmtAmount(stats.netIn, stats.currency),    color: "text-emerald-700" },
                  { label: "Reste à recouvrer",          value: fmtAmount(stats.remaining, stats.currency),color: stats.remaining > 0 ? "text-amber-600" : "text-emerald-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                    <span className="text-gray-500">{label}</span>
                    <span className={`font-bold ${color}`}>{value}</span>
                  </div>
                ))}
                {/* Barre de progression */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Taux de collecte</span>
                    <span className="font-semibold text-gray-600">
                      {stats.totalDue > 0 ? Math.round((stats.netIn / stats.totalDue) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all"
                      style={{ width: `${stats.totalDue > 0 ? Math.min(100, Math.round((stats.netIn / stats.totalDue) * 100)) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

// ── Composants ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, subColor, icon, iconBg, href }: {
  label: string; value: number; sub: string; subColor: string;
  icon: React.ReactNode; iconBg: string; href: string;
}) {
  return (
    <Link href={href} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow block">
      <div className="flex items-start justify-between mb-4">
        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider leading-tight">{label}</p>
        <div className={`${iconBg} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
      <p className="text-gray-900 text-3xl font-bold">{value}</p>
      <p className={`text-xs mt-1.5 font-medium ${subColor}`}>{sub}</p>
    </Link>
  );
}

function FinanceCard({ label, title, value, sub, net, bg, accent, href }: {
  label: string; title: string; value: string; sub: string; net: string;
  bg: string; accent: string; href: string;
}) {
  return (
    <Link href={href} className={`${bg} rounded-2xl p-6 relative overflow-hidden block hover:opacity-95 transition-opacity`}>
      <div className="absolute bottom-2 right-4 opacity-10 font-black select-none"
        style={{ color: accent, fontSize: 80, lineHeight: 1 }}>
        ₣
      </div>
      <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-1">{label}</p>
      <p className="text-white/75 text-sm mb-3 leading-snug">{title}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      <div className="mt-3 space-y-0.5">
        <p className="text-white/40 text-xs">{sub}</p>
        <p className="text-xs font-semibold" style={{ color: accent }}>{net}</p>
      </div>
    </Link>
  );
}

// ── Icônes ────────────────────────────────────────────────────────────────────

function PilgrimsIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function VisaIcon() {
  return (
    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function FlightIcon() {
  return (
    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}
