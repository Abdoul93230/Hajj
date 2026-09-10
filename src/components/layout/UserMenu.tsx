"use client";

import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

type Props = {
  user: { name: string; role: string; photoUrl?: string | null } | null;
};

export default function UserMenu({ user }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (user) {
    const initials = user.name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <div className="hidden sm:flex items-center gap-1.5">
        <Link
          href="/compte/mon-dossier"
          title={user.name}
          className="group flex-shrink-0"
        >
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoUrl}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#0f5132]/20 group-hover:ring-[#0f5132]/60 transition-all"
            />
          ) : (
            <span className="w-8 h-8 rounded-full bg-[#0f5132]/10 text-[#0f5132] text-[11px] font-bold flex items-center justify-center ring-2 ring-[#0f5132]/10 group-hover:ring-[#0f5132]/50 transition-all">
              {initials}
            </span>
          )}
        </Link>
        <button
          onClick={handleLogout}
          title="Déconnexion"
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5A2.25 2.25 0 003.75 5.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/compte"
      className="hidden sm:block text-sm font-semibold border border-[#0f5132] text-[#0f5132] px-3 py-1.5 rounded-full hover:bg-[#0f5132] hover:text-white transition-colors"
    >
      Espace pèlerin
    </Link>
  );
}
