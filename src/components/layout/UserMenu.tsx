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
      <div className="hidden sm:flex items-center gap-2.5">
        <Link
          href="/compte/mon-dossier"
          className="flex items-center gap-2 group"
        >
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoUrl}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#0f5132]/20 group-hover:ring-[#0f5132]/50 transition-all"
            />
          ) : (
            <span className="w-8 h-8 rounded-full bg-[#0f5132]/10 text-[#0f5132] text-[11px] font-bold flex items-center justify-center ring-2 ring-[#0f5132]/10 group-hover:ring-[#0f5132]/40 transition-all">
              {initials}
            </span>
          )}
          <span className="text-sm font-semibold text-[#0f5132] group-hover:underline">
            {user.name.split(" ")[0]}
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-500 border border-gray-200 px-2 py-1 rounded-full hover:border-amber-400 hover:text-amber-500 transition-colors"
        >
          Déconnexion
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
