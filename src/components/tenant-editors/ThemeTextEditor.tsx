"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, RotateCcw, Save, Search } from "lucide-react";
import type { SlotLocales, ThemeSlotGroupPayload } from "@/lib/tenant-theme";

const inputCls =
  "w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-300";

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
 * Chaque champ est PRÉ-REMPLI avec le texte actuellement affiché (override du
 * tenant, sinon texte de la plateforme) et éditable en fr/en/ar. À
 * l'enregistrement, seules les différences avec la plateforme sont envoyées.
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
    // PRÉ-REMPLISSAGE : le champ contient la valeur EFFECTIVE — l'override du
    // tenant s'il existe, sinon le texte statique de la plateforme. L'utilisateur
    // voit et modifie un vrai texte, jamais un champ vide.
    for (const g of groups) {
      for (const s of g.slots) {
        init[s.key] = {
          fr: s.override.fr.trim() || s.statics.fr,
          en: s.override.en.trim() || s.statics.en,
          ar: s.override.ar.trim() || s.statics.ar,
        };
      }
    }
    init[metaKey] = {
      fr: metaOverride.fr.trim() || metaStatics.fr,
      en: metaOverride.en.trim() || metaStatics.en,
      ar: metaOverride.ar.trim() || metaStatics.ar,
    };
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Sections repliables (1095 champs : tout afficher d'un coup serait lourd).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const toggleGroup = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const q = query.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        slots: group.slots.filter(
          (slot) =>
            slot.label.toLowerCase().includes(q) ||
            slot.key.toLowerCase().includes(q) ||
            group.group.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.slots.length > 0);
  }, [groups, q]);

  const totalSlots = useMemo(() => groups.reduce((n, g) => n + g.slots.length, 0), [groups]);

  const setValue = (key: string, lang: keyof SlotLocales, value: string) =>
    setValues((s) => ({ ...s, [key]: { ...s[key], [lang]: value } }));

  const staticsByKey = useMemo(() => {
    const map: Record<string, SlotLocales> = {};
    for (const g of groups) for (const s of g.slots) map[s.key] = s.statics;
    map[metaKey] = metaStatics;
    return map;
  }, [groups, metaKey, metaStatics]);

  /** Overrides tels que chargés depuis la base ("" = pas d'override). */
  const overridesByKey = useMemo(() => {
    const map: Record<string, SlotLocales> = {};
    for (const g of groups) for (const s of g.slots) map[s.key] = s.override;
    map[metaKey] = metaOverride;
    return map;
  }, [groups, metaKey, metaOverride]);

  /** Remet ce champ au texte de la plateforme (supprime l'override). */
  const resetSlot = (key: string) =>
    setValues((s) => ({ ...s, [key]: { ...staticsByKey[key] } }));

  const isCustom = (key: string) => {
    const stat = staticsByKey[key];
    const val = values[key];
    if (!val) return false;
    return (["fr", "en", "ar"] as const).some((lang) => val[lang].trim() !== stat?.[lang]);
  };

  const customCount = useMemo(
    () =>
      groups.reduce(
        (n, group) =>
          n +
          group.slots.filter((slot) => {
            const val = values[slot.key];
            const stat = staticsByKey[slot.key];
            if (!val || !stat) return false;
            return (["fr", "en", "ar"] as const).some(
              (lang) => val[lang].trim() !== stat[lang].trim()
            );
          }).length,
        0
      ),
    [groups, values, staticsByKey]
  );

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      // N'envoyer que les DIFFÉRENCES avec le texte de la plateforme :
      //  - champ modifié            → valeur envoyée (chaîne vide = efface l'override) ;
      //  - champ identique au texte plateforme → rien (évite de copier toute la
      //    plateforme dans la base du tenant) ; si un override existait et est
      //    revenu au défaut, on envoie "" pour le supprimer.
      const content: Record<string, Partial<SlotLocales>> = {};
      for (const key of Object.keys(values)) {
        const stat = staticsByKey[key];
        const cur = values[key];
        if (!stat || !cur) continue;
        const patch: Partial<SlotLocales> = {};
        const original = overridesByKey[key] ?? { fr: "", en: "", ar: "" };
        for (const lang of ["fr", "en", "ar"] as const) {
          const now = cur[lang].trim();
          const def = stat[lang].trim();
          if (now !== def) patch[lang] = now;
          else if (original[lang].trim()) patch[lang] = ""; // revenu au défaut → supprime l'override
        }
        if (Object.keys(patch).length) content[key] = patch;
      }
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
            <strong>{totalSlots}</strong> textes personnalisables · <strong>{customCount}</strong>{" "}
            personnalisé(s) — les champs sont pré-remplis avec le texte actuel ; seules vos
            modifications sont enregistrées.
          </p>
        </div>
        <SaveButton onClick={() => void save()} saving={saving} saved={saved} />
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un texte (libellé, clé, groupe)…"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Échec de l&apos;enregistrement : {error}
        </div>
      )}

      {/* __GROUPS__ */}
      {visibleGroups.map((group) => {
        const isOpen = expanded.has(group.group) || q !== "";
        return (
        <section key={group.group} className="rounded-2xl border border-gray-200 bg-white p-5">
          <button
            type="button"
            onClick={() => toggleGroup(group.group)}
            className="mb-4 flex w-full items-center justify-between gap-2 text-left"
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
              {group.group}
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-400">
                {group.slots.length}
              </span>
            </h2>
            <ChevronDown
              size={16}
              className={`shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isOpen && group.slots.map((slot) => (
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
        );
      })}
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
