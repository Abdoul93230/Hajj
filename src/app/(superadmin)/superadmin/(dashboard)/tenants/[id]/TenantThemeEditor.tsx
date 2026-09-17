"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Loader2, Save, Trash2, Upload } from "lucide-react";
import { DEFAULT_ACCENT, DEFAULT_BRAND, readableOn, shade } from "@/lib/tenant-theme";

type ThemeObj = Record<string, unknown>;
type Locales = Record<"fr" | "en" | "ar", string>;

const CONTENT_FIELDS = [
  { key: "heroTitle", label: "Titre principal (accueil)" },
  { key: "heroSubtitle", label: "Sous-titre (accueil)" },
  { key: "footerDescription", label: "Description (pied de page)" },
  { key: "metaDescription", label: "Description SEO (Google, partages)" },
] as const;

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function initialLocales(v: unknown): Locales {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return { fr: str(o.fr), en: str(o.en), ar: str(o.ar) };
  }
  if (typeof v === "string") return { fr: v, en: "", ar: "" };
  return { fr: "", en: "", ar: "" };
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default function TenantThemeEditor({ tenantId, theme }: { tenantId: string; theme: unknown }) {
  const t = theme && typeof theme === "object" ? (theme as ThemeObj) : {};
  const content = t.content && typeof t.content === "object" ? (t.content as ThemeObj) : {};

  const [primaryColor, setPrimary] = useState(str(t.primaryColor, DEFAULT_BRAND));
  const [accentColor, setAccent] = useState(str(t.accentColor, DEFAULT_ACCENT));
  const [logoUrl, setLogoUrl] = useState(str(t.logoUrl));
  const [whatsappNumber, setWhatsapp] = useState(str(t.whatsappNumber));
  const [phone, setPhone] = useState(str(t.phone));
  const [facebookUrl, setFacebook] = useState(str(t.facebookUrl));
  const [tiktokUrl, setTiktok] = useState(str(t.tiktokUrl));
  const [contentState, setContentState] = useState<Record<string, Locales>>(() => {
    const c: Record<string, Locales> = {};
    for (const f of CONTENT_FIELDS) c[f.key] = initialLocales(content[f.key]);
    return c;
  });
  const [loc, setLoc] = useState<"fr" | "en" | "ar">("fr");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const brand = HEX_RE.test(primaryColor) ? primaryColor : DEFAULT_BRAND;
  const accent = HEX_RE.test(accentColor) ? accentColor : DEFAULT_ACCENT;

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primaryColor,
        accentColor,
        logoUrl,
        whatsappNumber,
        phone,
        facebookUrl,
        tiktokUrl,
        content: contentState,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setUploadError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/superadmin/tenants/${tenantId}/logo`, { method: "POST", body: fd });
    if (res.ok) {
      const j = (await res.json()) as { url?: string };
      if (j.url) setLogoUrl(j.url);
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setUploadError(j.error ?? "Échec de l'upload");
    }
    setUploading(false);
  }

  const setLocaleField = (key: string, value: string) =>
    setContentState((s) => ({ ...s, [key]: { ...s[key], [loc]: value } }));

  const inputCls =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-300";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-gray-900">🎨 Personnalisation de l&apos;agence</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Couleurs, logo et textes appliqués instantanément au portail public et à l&apos;espace agence.
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

      <div className="p-5 space-y-6">
        {/* ── Couleurs ── */}
        <section className="space-y-3">
          <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">Couleurs</p>
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
                className="flex-1 h-12 rounded-xl flex items-center justify-center text-[11px] font-semibold border border-black/5"
                style={{ backgroundColor: s.bg, color: s.fg }}
              >
                {s.label}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">
            Les déclinaisons (profond / claire / pâle) sont calculées automatiquement — l&apos;agence choisit une seule couleur.
          </p>
        </section>

        {/* ── Logo ── */}
        <section className="space-y-3">
          <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">Logo</p>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden relative flex-shrink-0">
              {logoUrl ? (
                <Image src={logoUrl} alt="Logo" fill className="object-contain" unoptimized />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">Aucun</span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 text-sm font-medium border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition disabled:opacity-60"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "Téléversement…" : "Téléverser un logo"}
            </button>
            {logoUrl && (
              <button
                onClick={() => setLogoUrl("")}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition"
                title="Retirer le logo (puis Enregistrer)"
              >
                <Trash2 size={14} /> Retirer
              </button>
            )}
          </div>
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          <p className="text-[11px] text-gray-400">
            Utilisé dans l&apos;en-tête, le pied de page, les reçus et les badges. PNG carré recommandé (max 4 Mo).
            Retrait : cliquer « Retirer » puis « Enregistrer ».
          </p>
        </section>

        {/* ── Contact & réseaux ── */}
        <section className="space-y-3">
          <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">Contact &amp; réseaux</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600">WhatsApp (bouton flottant, footer)</label>
              <input className={inputCls} value={whatsappNumber} onChange={(e) => setWhatsapp(e.target.value)} placeholder="22791882121" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Téléphone affiché</label>
              <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+227 96 96 39 61" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Page Facebook</label>
              <input className={inputCls} value={facebookUrl} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/…" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">Compte TikTok</label>
              <input className={inputCls} value={tiktokUrl} onChange={(e) => setTiktok(e.target.value)} placeholder="https://tiktok.com/@…" />
            </div>
          </div>
        </section>

        {/* ── Textes ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">Textes de l&apos;agence</p>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {(["fr", "en", "ar"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLoc(l)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    loc === l ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {CONTENT_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-gray-600">{f.label}</label>
                {f.key === "footerDescription" || f.key === "metaDescription" ? (
                  <textarea
                    rows={2}
                    className={`${inputCls} mt-1 resize-y`}
                    value={contentState[f.key][loc]}
                    onChange={(e) => setLocaleField(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    className={`${inputCls} mt-1`}
                    value={contentState[f.key][loc]}
                    onChange={(e) => setLocaleField(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">
            Un champ laissé vide retombe sur le texte par défaut de la plateforme (dans la langue du visiteur).
            Un texte saisi en FR s&apos;affiche aussi en EN/AR tant que ces langues restent vides.
          </p>
        </section>
      </div>
    </div>
  );
}