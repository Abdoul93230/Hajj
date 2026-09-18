"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "couleurs", label: "🎨 Couleurs" },
  { href: "logo-contact", label: "🖼️ Logo & Contact" },
  { href: "medias", label: "🏞️ Images" },
  { href: "textes", label: "✍️ Textes" },
];

export default function PersonnalisationNav({ tenantId }: { tenantId: string }) {
  const pathname = usePathname();
  const base = `/superadmin/tenants/${tenantId}/personnalisation`;

  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      {TABS.map((t) => {
        const active = pathname === `${base}/${t.href}`;
        return (
          <Link
            key={t.href}
            href={`${base}/${t.href}`}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
              active ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}