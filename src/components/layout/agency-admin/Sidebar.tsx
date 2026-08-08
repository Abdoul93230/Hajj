"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types";
import LogoutButton from "@/components/ui/LogoutButton";

const NAV: { href: string; label: string; Icon: ({ active }: { active: boolean }) => React.ReactElement }[] = [
  { href: "",              label: "Tableau de bord",         Icon: DashboardIcon },
  { href: "/pilgrims",     label: "Pèlerins",                Icon: PilgrimsIcon },
  { href: "/voyages",      label: "Voyages",                 Icon: VoyagesIcon },
  { href: "/groups",       label: "Groupes",                 Icon: GroupsIcon },
  { href: "/documents",    label: "Documents Pèlerins",      Icon: DocumentsIcon },
  { href: "/flights",      label: "Billets d'avion",         Icon: FlightsIcon },
  { href: "/hotels",       label: "Hôtels & Chambres",       Icon: HotelsIcon },
  { href: "/transports",   label: "Transports",              Icon: TransportsIcon },
  { href: "/guides",       label: "Guides & Accompagnateurs",Icon: GuidesIcon },
  { href: "/payments",     label: "Paiements",               Icon: PaymentsIcon },
  { href: "/credits",      label: "Crédits & Soldes",        Icon: CreditsIcon },
  { href: "/invoices",     label: "Factures & Devis",        Icon: InvoicesIcon },
  { href: "/planning",     label: "Planning",                Icon: PlanningIcon },
  { href: "/messages",     label: "Messages",                Icon: MessagesIcon },
];

const NAV_BOTTOM = [
  { href: "/team",     label: "Équipe",     Icon: TeamIcon },
  { href: "/portal",   label: "Portail",    Icon: PortalIcon },
  { href: "/settings", label: "Paramètres", Icon: SettingsIcon },
];

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
        {/* Secondary icons */}
        <div className="px-3 pt-2 pb-1 flex items-center justify-around">
          {NAV_BOTTOM.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={`${base}${item.href}`}
                title={item.label}
                className={`p-2 rounded-lg transition-all ${
                  active
                    ? "bg-[#d4af37]/15 text-[#d4af37]"
                    : "text-white/30 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.Icon active={active} />
              </Link>
            );
          })}
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
function GroupsIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />;
}
function PassportIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />;
}
function FlightsIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />;
}
function HotelsIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />;
}
function TransportsIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />;
}
function GuidesIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />;
}
function PaymentsIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />;
}
function CreditsIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />;
}
function InvoicesIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />;
}
function DocumentsIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />;
}
function PlanningIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />;
}
function MessagesIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />;
}
function TeamIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />;
}
function PortalIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />;
}
function SettingsIcon({ active }: { active: boolean }) {
  return <NavIcon active={active} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />;
}
