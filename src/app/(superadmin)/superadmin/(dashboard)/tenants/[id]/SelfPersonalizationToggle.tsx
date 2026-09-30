"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

/**
 * Interrupteur superadmin : ouvre (ou ferme) la personnalisation autonome pour
 * CETTE agence (`Tenant.selfPersonalization`). Quand c'est activé, l'admin de
 * l'agence voit l'onglet « Personnalisation » dans sa sidebar et peut modifier
 * couleurs, logo, images et textes lui-même ; sinon l'API refuse (403).
 */
export default function SelfPersonalizationToggle({
  tenantId,
  enabled,
}: {
  tenantId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    const next = !on;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfPersonalization: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
      }
      setOn(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            ✍️ Personnalisation par l&apos;agence
          </h2>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
            Autorise l&apos;admin de cette agence à modifier lui-même les couleurs, le logo, les
            images et les textes depuis son espace (<span className="font-mono">/agency-admin/personalisation</span>).
            Désactivée, l&apos;agence ne voit aucun onglet de personnalisation et ses tentatives
            d&apos;enregistrement sont refusées.
          </p>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>

        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy}
          aria-pressed={on}
          title={on ? "Cliquer pour désactiver" : "Cliquer pour activer"}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition disabled:opacity-60 ${
            on
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
          {on ? "Activée" : "Désactivée"}
        </button>
      </div>
    </div>
  );
}
