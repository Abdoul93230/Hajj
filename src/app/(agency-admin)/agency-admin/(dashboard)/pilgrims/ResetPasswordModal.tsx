"use client";

import { useState } from "react";

interface Props {
  pilgrim: { id: string; name: string };
  onClose: () => void;
  /** Après succès : ferme la modale et rafraîchit la liste / le détail. */
  onDone: () => void;
}

/**
 * Réinitialisation du mot de passe d'un pèlerin par l'agence.
 * - Mot de passe provisoire généré (recommandé) ou saisi par l'agence (≥ 8).
 * - Affiché UNE seule fois (bouton Copier) → à transmettre au pèlerin.
 * - Le changement sera imposé au pèlerin à sa prochaine connexion.
 */
export default function ResetPasswordModal({ pilgrim, onClose, onDone }: Props) {
  const [useCustom, setUseCustom] = useState(false);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleReset() {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/agency-admin/pilgrims/${pilgrim.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(useCustom && custom ? { password: custom } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Erreur lors de la réinitialisation");
        return;
      }
      setTempPassword(data.tempPassword);
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPassword() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copie impossible — notez le mot de passe manuellement.");
    }
  }

  const inputCls =
    "w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        {tempPassword ? (
          /* ── Résultat : affiché une seule fois ── */
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Mot de passe réinitialisé</p>
                <p className="text-gray-400 text-xs mt-0.5">{pilgrim.name}</p>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-3 leading-relaxed">
              Transmettez ce mot de passe au pèlerin — il ne s&apos;affichera{" "}
              <strong>qu&apos;une seule fois</strong> :
            </p>

            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3">
              <code className="flex-1 font-mono text-sm font-bold text-gray-800 select-all break-all">
                {tempPassword}
              </code>
              <button
                type="button"
                onClick={copyPassword}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition flex-shrink-0 ${
                  copied ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                {copied ? "Copié ✓" : "Copier"}
              </button>
            </div>

            <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg mb-4 leading-snug">
              Le changement de mot de passe sera <strong>imposé</strong> au pèlerin
              à sa prochaine connexion.
            </p>

            <button
              type="button"
              onClick={onDone}
              className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition"
            >
              J&apos;ai noté — Fermer
            </button>
          </>
        ) : (
          /* ── Choix du mode de réinitialisation ── */
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">Réinitialiser le mot de passe</p>
                <p className="text-gray-400 text-xs mt-0.5">{pilgrim.name}</p>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="space-y-2 mb-4">
              <label className="flex items-start gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="reset-mode"
                  checked={!useCustom}
                  onChange={() => setUseCustom(false)}
                  className="mt-0.5 accent-[var(--brand)]"
                />
                <span className="text-sm text-gray-700">
                  <strong>Générer un mot de passe provisoire</strong>
                  <span className="block text-[11px] text-gray-400">
                    Recommandé — affiché à la fin, à transmettre au pèlerin.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="radio"
                  name="reset-mode"
                  checked={useCustom}
                  onChange={() => setUseCustom(true)}
                  className="mt-0.5 accent-[var(--brand)]"
                />
                <span className="text-sm text-gray-700">
                  <strong>Choisir moi-même le mot de passe</strong>
                  <span className="block text-[11px] text-gray-400">
                    8 caractères minimum.
                  </span>
                </span>
              </label>
            </div>

            {useCustom && (
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Nouveau mot de passe (8 car. min)"
                className={inputCls + " mb-4"}
              />
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading || (useCustom && custom.length < 8)}
                className="flex-1 py-2 px-4 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition disabled:opacity-60"
              >
                {loading ? "Réinitialisation..." : "Réinitialiser"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
