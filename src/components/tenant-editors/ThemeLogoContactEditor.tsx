"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, Loader2, Save, Trash2, Upload } from "lucide-react";

type ThemeObj = Record<string, unknown>;
const inputCls =
  "w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-300";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export default function ThemeLogoContactEditor({
  tenantId,
  theme,
}: {
  tenantId: string;
  theme: unknown;
}) {
  const t = theme && typeof theme === "object" ? (theme as ThemeObj) : {};

  const [logoUrl, setLogoUrl] = useState(str(t.logoUrl));
  const [whatsappNumber, setWhatsapp] = useState(str(t.whatsappNumber));
  const [phone, setPhone] = useState(str(t.phone));
  const [facebookUrl, setFacebook] = useState(str(t.facebookUrl));
  const [tiktokUrl, setTiktok] = useState(str(t.tiktokUrl));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl, whatsappNumber, phone, facebookUrl, tiktokUrl }),
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
    const res = await fetch(`/api/superadmin/tenants/${tenantId}/logo`, {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      const j = (await res.json()) as { url?: string };
      if (j.url) setLogoUrl(j.url);
      router.refresh();
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setUploadError(j.error ?? "Échec de l'upload");
    }
    setUploading(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-gray-900">Logo &amp; contact</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Le logo apparaît dans l&apos;en-tête, le pied de page, les reçus et les badges.
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
        {/* ── Logo ── */}
        <section className="space-y-3">
          <p className="text-xs font-bold tracking-widest text-gray-500 uppercase">Logo</p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden relative flex-shrink-0">
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
              className="flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl px-3 py-2 bg-white hover:bg-gray-50 transition disabled:opacity-60"
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
            PNG carré recommandé (max 4 Mo). Retrait : « Retirer » puis « Enregistrer ».
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
          <p className="text-[11px] text-gray-400">
            Laisser vide = retombe sur les coordonnées par défaut de la plateforme.
          </p>
        </section>
      </div>
    </div>
  );
}