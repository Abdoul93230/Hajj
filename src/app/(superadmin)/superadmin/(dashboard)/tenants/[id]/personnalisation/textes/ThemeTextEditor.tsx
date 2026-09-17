"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";

type ThemeObj = Record<string, unknown>;
type Locales = Record<"fr" | "en" | "ar", string>;
const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-300";

const CONTENT_FIELDS = [
  { key: "heroTitle", label: "Titre principal (accueil)", hint: "Remplace le grand titre du hero de la page d'accueil." },
  { key: "heroSubtitle", label: "Sous-titre (accueil)", hint: "Phrase d'accroche sous le titre principal." },
  { key: "footerDescription", label: "Description (pied de page)", hint: "Présentation courte de l'agence dans le footer." },
  { key: "metaDescription", label: "Description SEO (Google, partages)", hint: "Description affichée par les moteurs de recherche et réseaux sociaux." },
] as const;

function initialLocales(v: unknown): Locales {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const s = (x: unknown) => (typeof x === "string" ? x : "");
    return { fr: s(o.fr), en: s(o.en), ar: s(o.ar) };
  }
  if (typeof v === "string") return { fr: v, en: "", ar: "" };
  return { fr: "", en: "", ar: "" };
}

export default function ThemeTextEditor({ tenantId, theme }: { tenantId: string; theme: unknown }) {
  const t = theme && typeof theme === "object" ? (theme as ThemeObj) : {};
  const content = t.content && typeof t.content === "object" ? (t.content as ThemeObj) : {};

  const [contentState, setContentState] = useState<Record<string, Locales>>(() => {
    const c: Record<string, Locales> = {};
    for (const f of CONTENT_FIELDS) c[f.key] = initialLocales(content[f.key]);
    return c;
  });
  const [loc, setLoc] = useState<"fr" | "en" | "ar">("fr");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: contentState }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }
  }

  const setField = (key: string, value: string) =>
    setContentState((s) => ({ ...s, [key]: { ...s[key], [loc]: value } }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-gray-900">Textes de l&apos;agence</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Personnalisez les textes clés du portail public dans les 3 langues.
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
        <div className="flex justify-end">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(["fr", "en", "ar"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLoc(l)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${
                  loc === l ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {CONTENT_FIELDS.map((f) => (
            <div key={f.key} className="border border-gray-100 rounded-xl p-4 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <label className="text-sm font-semibold text-gray-700">{f.label}</label>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{loc}</span>
              </div>
              {f.key === "footerDescription" || f.key === "metaDescription" ? (
                <textarea
                  rows={2}
                  className={inputCls}
                  value={contentState[f.key][loc]}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              ) : (
                <input
                  className={inputCls}
                  value={contentState[f.key][loc]}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              )}
              <p className="text-[11px] text-gray-400">{f.hint}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-[11px] text-gray-600 leading-relaxed">
            <strong>Règle de repli :</strong> un champ laissé vide retombe sur le texte par défaut de la
            plateforme (dans la langue du visiteur). Un texte saisi en FR s&apos;affiche aussi en EN/AR
            tant que ces langues restent vides — pas besoin de tout traduire d&apos;un coup.
          </p>
        </div>
      </div>
    </div>
  );
}