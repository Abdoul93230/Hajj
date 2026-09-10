"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { FolderOpen, FileText, Map, Plane } from "lucide-react";

export default function PortalNav() {
  const t = useTranslations("portal");
  const pathname = usePathname();

  const tabs = [
    { href: "/compte/mon-dossier", label: t("nav.dossier"), icon: FolderOpen },
    { href: "/compte/voyages", label: t("nav.voyages"), icon: Plane },
    { href: "/compte/mes-documents", label: t("nav.documents"), icon: FileText },
    { href: "/compte/mon-programme", label: t("nav.program"), icon: Map },
  ];

  return (
    <div className="flex gap-1.5 mb-6 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
              active
                ? "bg-[#0f5132] text-white shadow"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(" ")[1] ?? label}</span>
          </Link>
        );
      })}
    </div>
  );
}
