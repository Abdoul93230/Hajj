"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/types";
import YearSelector from "./YearSelector";
import LogoutButton from "@/components/ui/LogoutButton";

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function formatDate(d: Date) {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} À ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

const PAGE_TITLES: Record<string, string> = {
  "":           "Tableau de bord",
  "pilgrims":   "Registre de gestion des Pèlerins",
  "voyages":    "Planification des Voyages & Forfaits",
  "groups":     "Groupes de Pèlerins",
  "passports":  "Passeports & Visas",
  "flights":    "Billets d'avion",
  "hotels":     "Hôtels & Chambres",
  "transports": "Transports",
  "guides":     "Guides & Accompagnateurs",
  "payments":   "Paiements",
  "credits":    "Crédits & Soldes",
  "invoices":   "Factures & Devis",
  "documents":  "Documents",
  "planning":   "Planning",
  "messages":   "Messages",
  "team":       "Équipe",
  "portal":     "Portail Public",
  "settings":   "Paramètres",
};

function getPageTitle(pathname: string): string {
  const segment = pathname.split("/agency-admin/")[1]?.split("/")[0] ?? "";
  return PAGE_TITLES[segment] ?? "Tableau de bord";
}

export default function AgencyAdminTopbar({
  user,
  tenantName,
  selectedYear,
  availableYears,
}: {
  user: { name: string; role: UserRole };
  tenantName: string;
  selectedYear: number;
  availableYears: number[];
}) {
  const [now, setNow] = useState<string>("");
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    setNow(formatDate(new Date()));
    const id = setInterval(() => setNow(formatDate(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 flex-shrink-0">
      {/* Titre + date */}
      <div className="flex-1 min-w-0">
        <h1 className="text-gray-900 font-bold text-lg leading-tight truncate">{pageTitle}</h1>
        {now && (
          <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {now}
          </p>
        )}
      </div>

      {/* Sélecteur d'année */}
      <YearSelector selectedYear={selectedYear} availableYears={availableYears} />

      {/* Notif */}
      <button className="relative p-2 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {/* User */}
      <div className="flex items-center gap-2.5 pl-4 border-l border-gray-100 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-[#0f5132] flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-gray-900 font-semibold text-sm leading-tight">{user.name}</p>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide">{tenantName}</p>
        </div>
        <LogoutButton
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Se déconnecter"
        />
      </div>
    </header>
  );
}
