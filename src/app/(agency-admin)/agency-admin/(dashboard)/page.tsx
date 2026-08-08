import type { Metadata } from "next";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Tableau de bord" };

async function getStats(tenantId: string, year: number) {
  const from = new Date(year, 0, 1);       // 1er janvier
  const to   = new Date(year + 1, 0, 1);   // 1er janvier année suivante (exclu)

  const yearFilter = { gte: from, lt: to };

  const [pilgrims, reservations, offers, messages, reviews] = await Promise.all([
    prisma.user.count({
      where: { tenantId, role: "PILGRIM", createdAt: yearFilter },
    }),
    prisma.reservation.count({
      where: { tenantId, status: "CONFIRMED", createdAt: yearFilter },
    }),
    prisma.offer.count({
      where: { tenantId, active: true, createdAt: yearFilter },
    }),
    prisma.contactMessage.count({
      where: { tenantId, read: false, createdAt: yearFilter },
    }),
    prisma.review.count({
      where: { tenantId, approved: false, createdAt: yearFilter },
    }),
  ]);
  return { pilgrims, reservations, offers, messages, reviews };
}

export default async function AgencyDashboard() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug") ?? "";

  const tenant = tenantSlug
    ? await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    : null;

  // Lire l'année sélectionnée depuis le cookie
  const currentYear = new Date().getFullYear();
  const cookieStore = await cookies();
  const cookieYear = cookieStore.get("zam_selected_year")?.value;
  const parsedCookieYear = cookieYear ? parseInt(cookieYear, 10) : NaN;
  const minYear = tenant ? tenant.createdAt.getFullYear() : currentYear;
  const selectedYear =
    !isNaN(parsedCookieYear) && parsedCookieYear >= minYear && parsedCookieYear <= currentYear
      ? parsedCookieYear
      : currentYear;

  const stats = tenant ? await getStats(tenant.id, selectedYear) : null;
  const isCurrentYear = selectedYear === currentYear;

  return (
    <div className="space-y-6 w-full">

      {/* Banner */}
      <div className="relative bg-[#0f2419] rounded-2xl px-8 py-7 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #d4af37 0%, transparent 60%)" }} />
        <div className="relative z-10 flex items-start justify-between">
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
              Bienvenue dans <span className="text-[#d4af37] font-semibold">HajjManager Pro</span>.
              Suivez passeports, visas, réservations et situation comptable de votre agence.
            </p>
          </div>
          {/* Badge saison */}
          <div className="flex-shrink-0 ml-6">
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

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pèlerins inscrits"
            value={stats.pilgrims}
            sub={isCurrentYear ? "+100% Actifs" : `Saison ${selectedYear}`}
            subColor={isCurrentYear ? "text-emerald-500" : "text-gray-400"}
            icon={<PilgrimsIcon />}
            iconBg="bg-emerald-50"
          />
          <StatCard
            label="Visas accordés"
            value={stats.reservations}
            sub={`Sur ${stats.pilgrims} dossiers déposés`}
            subColor="text-gray-400"
            icon={<VisaIcon />}
            iconBg="bg-amber-50"
          />
          <StatCard
            label="Billets émis"
            value={stats.offers}
            sub="Départs & retours tracés"
            subColor="text-blue-500"
            icon={<FlightIcon />}
            iconBg="bg-blue-50"
          />
          <StatCard
            label="Lits occupés"
            value={stats.messages}
            sub="Logés Mecque & Médine"
            subColor="text-gray-400"
            icon={<HotelIcon />}
            iconBg="bg-purple-50"
          />
        </div>
      )}

      {/* Finances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinanceCard
          label="ENCAISSEMENTS"
          title="Total des paiements reçus"
          value="0 FCFA"
          link="Voir détails →"
          sub="Règlements pèlerins"
          bg="bg-[#0f5132]"
          accent="#d4af37"
        />
        <FinanceCard
          label="DÉCAISSEMENTS"
          title="Dépenses opérationnelles globales"
          value="0 FCFA"
          link="Gérer dépenses →"
          sub="Fournisseurs, vols, hôtels"
          bg="bg-[#7b1c1c]"
          accent="#f87171"
        />
        <FinanceCard
          label="SOLDES DÉBITEURS"
          title="Total des crédits / Restes à recouvrer"
          value="0 FCFA"
          link="Relancer →"
          sub="Bénéfice Net : 0 FCFA"
          bg="bg-[#7c4a00]"
          accent="#fbbf24"
        />
      </div>

      {/* Sections bas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          dot="bg-emerald-400"
          title="INSCRIPTIONS ACTIVES PAR FORFAIT DE VOYAGE"
          message="Aucune inscription active pour le moment."
        />
        <SectionCard
          dot="bg-amber-400"
          title="BILAN FINANCIER GLOBAL DE L'AGENCE"
          message="Les données financières apparaîtront ici."
        />
      </div>

    </div>
  );
}

// ── Composants ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, subColor, icon, iconBg }: {
  label: string; value: number; sub: string; subColor: string;
  icon: React.ReactNode; iconBg: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider leading-tight">{label}</p>
        <div className={`${iconBg} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
      </div>
      <p className="text-gray-900 text-3xl font-bold">{value}</p>
      <p className={`text-xs mt-1.5 font-medium ${subColor}`}>{sub}</p>
    </div>
  );
}

function FinanceCard({ label, title, value, link, sub, bg, accent }: {
  label: string; title: string; value: string; link: string;
  sub: string; bg: string; accent: string;
}) {
  return (
    <div className={`${bg} rounded-2xl p-6 relative overflow-hidden`}>
      <div className="absolute bottom-2 right-4 opacity-10 font-black select-none"
        style={{ color: accent, fontSize: 80, lineHeight: 1 }}>
        ₣
      </div>
      <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase mb-1">{label}</p>
      <p className="text-white/75 text-sm mb-4 leading-snug">{title}</p>
      <p className="text-white text-2xl font-bold">{value}</p>
      <div className="flex items-center justify-between mt-4">
        <p className="text-white/40 text-xs">{sub}</p>
        <button className="text-xs font-bold" style={{ color: accent }}>{link}</button>
      </div>
    </div>
  );
}

function SectionCard({ dot, title, message }: { dot: string; title: string; message: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <p className="text-gray-500 text-[11px] font-bold tracking-wider uppercase">{title}</p>
      </div>
      <p className="text-gray-300 text-sm">{message}</p>
    </div>
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
function HotelIcon() {
  return (
    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
