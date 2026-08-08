"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";

const NAV = [
  { href: "/superadmin",          label: "Dashboard",   icon: "⚡" },
  { href: "/superadmin/tenants",  label: "Agences",     icon: "🏢" },
  { href: "/superadmin/plans",    label: "Plans",       icon: "💳" },
  { href: "/superadmin/audit",    label: "Audit global",icon: "📋" },
  { href: "/superadmin/settings", label: "Paramètres",  icon: "⚙️" },
];

export default function SuperAdminSidebar({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-gray-900 font-bold text-sm">
            SA
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Super Admin</p>
            <p className="text-gray-400 text-xs">Hajj Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/superadmin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-amber-500/10 text-amber-400 font-medium"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-gray-400 text-xs truncate">{user.email}</p>
          </div>
          <LogoutButton
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
            title="Se déconnecter"
          />
        </div>
      </div>
    </aside>
  );
}
