"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";

type Props = {
  initial: {
    phone: string | null;
    address: string | null;
    emergencyName: string | null;
    emergencyPhone: string | null;
  };
};

export default function ProfileEditClient({ initial }: Props) {
  const t = useTranslations("portal.profile");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({
    phone: initial.phone ?? "",
    address: initial.address ?? "",
    emergencyName: initial.emergencyName ?? "",
    emergencyPhone: initial.emergencyPhone ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/pilgrim/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg({ ok: false, text: data.error ?? t("error") });
      } else {
        setMsg({ ok: true, text: t("saved") });
        router.refresh();
        setTimeout(() => setOpen(false), 900);
      }
    } catch {
      setMsg({ ok: false, text: t("error") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#0f5132] hover:underline"
      >
        <Pencil size={13} /> {t("edit")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t("title")}</h2>

            {msg && (
              <div
                className={`text-sm rounded-lg px-4 py-2.5 mb-4 ${
                  msg.ok
                    ? "bg-green-50 border border-green-100 text-green-700"
                    : "bg-amber-50 border border-amber-200 text-amber-700"
                }`}
              >
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t("phone")}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t("address")}
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t("emergencyName")}
                </label>
                <input
                  type="text"
                  value={form.emergencyName}
                  onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {t("emergencyPhone")}
                </label>
                <input
                  type="tel"
                  value={form.emergencyPhone}
                  onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
                >
                  ✕
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-[#0f5132] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0d4429] transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
