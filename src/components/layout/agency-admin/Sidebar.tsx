"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types";
import LogoutButton from "@/components/ui/LogoutButton";

// Seules les pages réellement implémentées sont listées ici — les entrées sans
// page (Groupes, Billets d'avion, Hôtels, Transports, Guides, Crédits & Soldes,
// Factures & Devis, Planning, Messages…) redirigeaient vers une 404.
const NAV: { href: string; label: string; Icon: ({ active }: { active: boolean }) => React.ReactElement }[] = [
  { href: "",           label: "Tableau de bord",    Icon: DashboardIcon },
  { href: "/pilgrims",  label: "Pèlerins",           Icon: PilgrimsIcon },
  { href: "/voyages",   label: "Voyages",            Icon: VoyagesIcon },
  { href: "/documents", label: "Documents Pèlerins", Icon: DocumentsIcon },
  { href: "/payments",  label: "Paiements",          Icon: PaymentsIcon },
  { href: "/messages",  label: "Messages SMS",       Icon: MessagesIcon },
];

// La rangée « Équipe / Portail / Paramètres » a été retirée : aucune de ces
// pages n'est implémentée (liens morts vers une 404).

export default function AgencyAdminSidebar({
  user,
  tenantName,
  tenantSlug,
}: {
  user: { name: string; email: string; role: UserRole };
  tenantName: string;
  tenantSlug: string;
}) {
  const pathname = usePathname();
  const base = "/agency-admin";
  const currentYear = new Date().getFullYear();

  function isActive(href: string) {
    const full = `${base}${href}`;
    if (href === "") return pathname === base || pathname === base + "/";
    return pathname === full || pathname.startsWith(full + "/");
  }

  return (
    <aside className="w-64 min-w-[256px] bg-[#0f2419] flex flex-col h-screen sticky top-0">
      {/* ── Logo ── */}
      <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#d4af37] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0f2419] font-black text-sm leading-none">
              {tenantSlug.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{tenantName}</p>
            <p className="text-[#d4af37] text-[9px] font-bold uppercase tracking-widest mt-0.5">
              Agence Partenaire
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={`${base}${item.href}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group ${
                active
                  ? "bg-[#d4af37]/15 text-[#d4af37]"
                  : "text-white/55 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.Icon active={active} />
              <span className="truncate">{item.label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#d4af37] flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="border-t border-white/10 flex-shrink-0">
        <div className="px-3 pt-2 pb-1 flex items-center justify-around">
          <LogoutButton
            className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Se déconnecter"
          />
        </div>

        {/* Branding */}
        <div className="px-4 pb-3 text-center">
          <p className="text-white/25 text-[9px] font-bold tracking-widest uppercase">
            HajjManager Pro • v1.0
          </p>
          <p className="text-white/15 text-[9px] mt-0.5">
            {tenantName} © {currentYear}
          </p>
        </div>
      </div>
    </aside>
  );
}

// ── Icon helpers ───────────────────────────────────────────────────────────────

function NavIcon({ active, d, d2 }: { active: boolean; d: string; d2?: string }) {
  return (
    <svg
      className={`w-[15px] h-[15px] flex-shrink-0 transition-colors ${
        active ? "text-[#d4af37]" : "text-white/40 group-hover:text-white/70"
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      {d2 && <path strokeLinecap="round" strokeLinejoin="round" d={d2} />}
    </svg>
  );
}

function DashboardIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />;
}
function PilgrimsIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />;
}
function VoyagesIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
}
function PaymentsIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />;
}
function DocumentsIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />;
}
function MessagesIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />;
}
