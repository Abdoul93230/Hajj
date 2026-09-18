"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, Save } from "lucide-react";
import type { SlotLocales, ThemeSlotGroupPayload } from "@/lib/tenant-theme";

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-300";

const LANGS = [
  { code: "fr" as const, label: "Français", dir: "ltr" as const },
  { code: "en" as const, label: "English", dir: "ltr" as const },
  { code: "ar" as const, label: "العربية", dir: "rtl" as const },
];

type Props = {
  tenantId: string;
  groups: ThemeSlotGroupPayload[];
  metaKey: string;
  metaStatics: SlotLocales;
  metaOverride: SlotLocales;
};

/**
 * Éditeur des textes personnalisés du tenant (superadmin).
 * Chaque slot = 3 champs (fr/en/ar). Vide = le texte statique de la plateforme
 * est utilisé (placeholder visible) — une chaîne vide SUPPRIME l'override de
 * cette langue (repli automatique sur le statique).
 */
export default function ThemeTextEditor({
  tenantId,
  groups,
  metaKey,
  metaStatics,
  metaOverride,
}: Props) {
  const [values, setValues] = useState<Record<string, SlotLocales>>(() => {
    const init: Record<string, SlotLocales> = {};
    for (const g of groups) for (const s of g.slots) init[s.key] = { ...s.override };
    init[metaKey] = { ...metaOverride };
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const setValue = (key: string, lang: keyof SlotLocales, value: string) =>
    setValues((s) => ({ ...s, [key]: { ...s[key], [lang]: value } }));

  const resetSlot = (key: string) =>
    setValues((s) => ({ ...s, [key]: { fr: "", en: "", ar: "" } }));

  const isCustom = (key: string) =>
    Object.values(values[key] ?? {}).some((v) => v.trim() !== "");

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const content: Record<string, SlotLocales> = {};
      for (const key of Object.keys(values)) content[key] = values[key];
      const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* __HEADER__ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Textes du portail</h1>
          <p className="mt-1 text-sm text-gray-500">
            Laissez vide pour utiliser le texte de la plateforme (visible en placeholder).
            Les 3 langues sont éditées ensemble.
          </p>
        </div>
        <SaveButton onClick={() => void save()} saving={saving} saved={saved} />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Échec de l&apos;enregistrement : {error}
        </div>
      )}

      {/* __GROUPS__ */}
      {groups.map((group) => (
        <section key={group.group} className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
            {group.group}
          </h2>

          {group.slots.map((slot) => (
            <div key={slot.key} className="mb-4 rounded-xl border border-gray-100 p-4 last:mb-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {slot.label}
                    {isCustom(slot.key) && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        personnalisé
                      </span>
                    )}
                  </p>
                  {slot.hint && <p className="text-xs text-gray-400">{slot.hint}</p>}
                </div>
                {isCustom(slot.key) && (
                  <button
                    type="button"
                    onClick={() => resetSlot(slot.key)}
                    title="Revenir au texte de la plateforme"
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  >
                    <RotateCcw size={12} /> Réinitialiser
                  </button>
                )}
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                {LANGS.map((lang) => (
                  <div key={lang.code}>
                    <p className="mb-1 text-[11px] font-medium text-gray-400">{lang.label}</p>
                    {slot.multiline ? (
                      <textarea
                        dir={lang.dir}
                        rows={3}
                        value={values[slot.key]?.[lang.code] ?? ""}
                        placeholder={slot.statics[lang.code]}
                        onChange={(e) => setValue(slot.key, lang.code, e.target.value)}
                        className={inputCls}
                      />
                    ) : (
                      <input
                        dir={lang.dir}
                        value={values[slot.key]?.[lang.code] ?? ""}
                        placeholder={slot.statics[lang.code]}
                        onChange={(e) => setValue(slot.key, lang.code, e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
      {/* __SEO__ */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-gray-500">SEO</h2>
        <p className="mb-4 text-xs text-gray-400">
          Description utilisée par les moteurs de recherche et les partages sociaux.
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          {LANGS.map((lang) => (
            <div key={lang.code}>
              <p className="mb-1 text-[11px] font-medium text-gray-400">{lang.label}</p>
              <textarea
                dir={lang.dir}
                rows={2}
                value={values[metaKey]?.[lang.code] ?? ""}
                placeholder={metaStatics[lang.code]}
                onChange={(e) => setValue(metaKey, lang.code, e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <SaveButton onClick={() => void save()} saving={saving} saved={saved} />
      </div>
    </div>
  );
}

function SaveButton({
  onClick,
  saving,
  saved,
}: {
  onClick: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
    >
      {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
      {saving ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
    </button>
  );
}
