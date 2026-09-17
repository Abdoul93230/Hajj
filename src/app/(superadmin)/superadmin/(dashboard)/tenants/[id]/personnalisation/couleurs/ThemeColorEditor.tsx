"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";
import { DEFAULT_ACCENT, DEFAULT_BRAND, readableOn, shade } from "@/lib/tenant-theme";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-300";

export default function ThemeColorEditor({ tenantId, theme }: { tenantId: string; theme: unknown }) {
  const t = theme && typeof theme === "object" ? (theme as Record<string, unknown>) : {};
  const [primaryColor, setPrimary] = useState(
    typeof t.primaryColor === "string" ? t.primaryColor : DEFAULT_BRAND
  );
  const [accentColor, setAccent] = useState(
    typeof t.accentColor === "string" ? t.accentColor : DEFAULT_ACCENT
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const brand = HEX_RE.test(primaryColor) ? primaryColor : DEFAULT_BRAND;
  const accent = HEX_RE.test(accentColor) ? accentColor : DEFAULT_ACCENT;

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryColor, accentColor }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-gray-900">Couleurs de l&apos;agence</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Deux couleurs suffisent — toutes les déclinaisons sont calculées automatiquement.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} className="text-green-400" /> : <Save size={15} />}
          {saving ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Couleur principale", value: primaryColor, set: setPrimary, def: DEFAULT_BRAND },
            { label: "Couleur d'accent (or)", value: accentColor, set: setAccent, def: DEFAULT_ACCENT },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
              <input
                type="color"
                value={HEX_RE.test(f.value) ? f.value : f.def}
                onChange={(e) => f.set(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer bg-white"
                aria-label={f.label}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700">{f.label}</p>
                <input
                  type="text"
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.def}
                  className={`${inputCls} mt-1 font-mono`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Aperçu des déclinaisons calculées */}
        <div className="flex gap-2">
          {[
            { bg: shade(brand, -0.62), fg: readableOn(shade(brand, -0.62)), label: "profond" },
            { bg: brand, fg: readableOn(brand), label: "principale" },
            { bg: shade(brand, 0.18), fg: readableOn(shade(brand, 0.18)), label: "claire" },
            { bg: shade(brand, 0.92), fg: "#374151", label: "pâle" },
            { bg: accent, fg: readableOn(accent), label: "accent" },
          ].map((s, i) => (
            <div
              key={i}
              className="flex-1 h-14 rounded-xl flex items-center justify-center text-[11px] font-semibold border border-black/5"
              style={{ backgroundColor: s.bg, color: s.fg }}
            >
              {s.label}
            </div>
          ))}
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
          <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Où ces couleurs s'appliquent</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Boutons, liens, en-tête et sidebar actifs, hero, badges de marque, jauge de progression,
            focus rings, reçus et badges imprimables. Les couleurs <strong>sémantiques</strong>
            (vert = payé, rouge = rejeté, orange = partiel) restent identiques pour toutes les agences.
          </p>
        </div>
      </div>
    </div>
  );
}