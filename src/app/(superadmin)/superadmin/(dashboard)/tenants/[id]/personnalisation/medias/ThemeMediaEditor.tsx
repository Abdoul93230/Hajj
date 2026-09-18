"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Loader2, RotateCcw, Upload } from "lucide-react";

type ThemeObj = Record<string, unknown>;

type MediaSlot = {
  kind: string;
  key: string;
  label: string;
  hint: string;
  fallback: string;
};

/** Les 4 images personnalisables + leur fallback plateforme. */
const SLOTS: MediaSlot[] = [
  {
    kind: "hero",
    key: "heroImageUrl",
    label: "Hero — page d'accueil",
    hint: "Grande image de fond en haut de la page d'accueil (format paysage, ≥ 1600 px).",
    fallback: "/images/hero-bg.jpg",
  },
  {
    kind: "offers",
    key: "offersBannerUrl",
    label: "Bannière — Offres & détail d'une offre",
    hint: "Fond de l'en-tête de la page Offres et du détail d'une offre.",
    fallback: "/images/kaaba.jpg",
  },
  {
    kind: "guide",
    key: "guideBannerUrl",
    label: "Bannière — Guide du pèlerin",
    hint: "Fond de l'en-tête de la page Guide du pèlerin.",
    fallback: "/images/mosque-interior.jpg",
  },
  {
    kind: "coran",
    key: "coranBannerUrl",
    label: "Bannière — Coran",
    hint: "Fond de l'en-tête de la page Coran.",
    fallback: "/images/quran.jpg",
  },
];

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-300";

export default function ThemeMediaEditor({
  tenantId,
  theme,
}: {
  tenantId: string;
  theme: unknown;
}) {
  const t = theme && typeof theme === "object" ? (theme as ThemeObj) : {};
  const router = useRouter();

  const [urls, setUrls] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      SLOTS.map((s) => [s.key, typeof t[s.key] === "string" ? (t[s.key] as string) : ""])
    )
  );
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const upload = async (slot: MediaSlot, file: File) => {
    setUploading(slot.kind);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", slot.kind);
    const res = await fetch(`/api/superadmin/tenants/${tenantId}/media`, {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const j = (await res.json()) as { url?: string };
      if (j.url) {
        setUrls((prev) => ({ ...prev, [slot.key]: j.url as string }));
        router.refresh();
      }
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Échec de l'upload");
    }
    setUploading(null);
  };

  /** Supprime l'image du thème → retour au visuel par défaut de la plateforme. */
  const reset = async (slot: MediaSlot) => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [slot.key]: "" }),
    });
    if (res.ok) {
      setUrls((prev) => ({ ...prev, [slot.key]: "" }));
      router.refresh();
    } else {
      setError("Échec de la suppression");
    }
    setSaving(false);
  };

  const saveAll = async () => {
    setSaving(true);
    setSaved(false);
    setError("");
    const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(SLOTS.map((s) => [s.key, urls[s.key] ?? ""]))),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } else {
      setError("Échec de l'enregistrement");
    }
  };

  return (
    <div className="w-full space-y-6 pb-16 text-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Images du portail</h1>
          <p className="mt-1 text-sm text-gray-500">
            Personnalisez les visuels de fond. Sans image, le visuel par défaut de la plateforme
            est utilisé.
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving || !!uploading}
          className="flex items-center gap-2 bg-gray-900 text-white hover:bg-black text-sm font-semibold px-4 py-2 rounded-xl transition disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} className="text-emerald-400" /> : <Upload size={15} />}
          {saving ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {SLOTS.map((slot) => {
          const url = urls[slot.key] ?? "";
          return (
            <section
              key={slot.key}
              className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3"
            >
              <div>
                <h2 className="text-sm font-bold text-gray-900">{slot.label}</h2>
                <p className="mt-0.5 text-xs text-gray-500">{slot.hint}</p>
              </div>

              <div className="relative h-36 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <Image
                  src={url || slot.fallback}
                  alt={slot.label}
                  fill
                  className={`object-cover ${url ? "" : "opacity-60"}`}
                  unoptimized
                />
                {!url && (
                  <span className="absolute top-2 right-2 rounded-full bg-gray-900/70 px-2 py-0.5 text-[10px] font-medium text-white">
                    visuel par défaut
                  </span>
                )}
              </div>

              <input
                value={url}
                onChange={(e) => setUrls((prev) => ({ ...prev, [slot.key]: e.target.value }))}
                placeholder="Ou collez une URL d'image…"
                className={`${inputCls} text-gray-900 placeholder:text-gray-400`}
              />

              <div className="flex items-center gap-2">
                <input
                  ref={(el) => {
                    fileRefs.current[slot.kind] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(slot, f);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileRefs.current[slot.kind]?.click()}
                  disabled={uploading !== null}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl px-3 py-2 bg-white hover:bg-gray-50 transition disabled:opacity-60"
                >
                  {uploading === slot.kind ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {uploading === slot.kind ? "Envoi…" : "Téléverser"}
                </button>
                {url && (
                  <button
                    onClick={() => void reset(slot)}
                    disabled={saving}
                    className="flex items-center gap-1 text-sm text-gray-600 border border-gray-300 rounded-xl px-3 py-2 bg-white hover:bg-gray-50 hover:text-gray-800 transition disabled:opacity-60"
                  >
                    <RotateCcw size={14} /> Réinitialiser
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
