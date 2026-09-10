"use client";

import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

type Props = {
  user: { name: string; role: string } | null;
};

export default function UserMenu({ user }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (user) {
    return (
      <div className="hidden sm:flex items-center gap-2">
        <Link
          href="/compte/mon-dossier"
          className="text-sm font-semibold text-[#0f5132] hover:underline"
        >
          {user.name.split(" ")[0]}
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
