"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/**
 * Modale NON contournable affichée tant que `mustChangePassword` est levé sur
 * le compte pèlerin (mot de passe provisoire généré à la création par l'agence
 * ou après réinitialisation). Rendue par le layout du portail ((portal)/layout)
 * qui relit le drapeau en base à chaque requête.
 */
export default function ForcePasswordChange() {
  const t = useTranslations("portal.security");
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (next !== confirm) {
      setError(t("errorMatch"));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("error"));
        return;
      }
      setDone(true);
      // Le layout relit le drapeau au rafraîchissement → la modale disparaît.
      setTimeout(() => router.refresh(), 900);
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-pw-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="font-semibold text-gray-800">{t("success")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h2 id="force-pw-title" className="font-bold text-gray-900 text-lg">
                {t("title")}
              </h2>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed mb-5">
              {t("subtitle")}
            </p>

            {error && (
              <p role="alert" className="text-red-600 text-xs mb-4 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  {t("current")}
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  {t("new")}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  required
                  minLength={8}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  {t("confirm")}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  className={inputCls}
                />
              </div>

              <p className="text-[11px] text-gray-400 leading-snug">{t("rule")}</p>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 px-4 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition disabled:opacity-60"
              >
                {busy ? t("saving") : t("submit")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
