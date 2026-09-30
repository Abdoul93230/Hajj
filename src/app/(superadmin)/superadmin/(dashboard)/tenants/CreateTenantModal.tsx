"use client";

import { useState } from "react";
import PhoneInput from "@/components/ui/PhoneInput";
import { ASSET_MODE_LABEL, type PortalAssetMode } from "@/lib/tenant-assets";

const COUNTRIES = [
  { code: "NE", label: "Niger" },
  { code: "ML", label: "Mali" },
  { code: "SN", label: "Sénégal" },
  { code: "GN", label: "Guinée" },
  { code: "CI", label: "Côte d'Ivoire" },
  { code: "BF", label: "Burkina Faso" },
  { code: "MR", label: "Mauritanie" },
  { code: "GM", label: "Gambie" },
  { code: "GW", label: "Guinée-Bissau" },
  { code: "MA", label: "Maroc" },
  { code: "TN", label: "Tunisie" },
  { code: "DZ", label: "Algérie" },
  { code: "CM", label: "Cameroun" },
  { code: "TG", label: "Togo" },
  { code: "BJ", label: "Bénin" },
  { code: "TD", label: "Tchad" },
  { code: "SL", label: "Sierra Leone" },
  { code: "LR", label: "Liberia" },
];

type FormData = {
  // Agence
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  plan: string;
  // Admin
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

const EMPTY: FormData = {
  name: "", slug: "", email: "", phone: "", address: "", country: "NE", plan: "STARTER",
  adminName: "", adminEmail: "", adminPassword: "",
};

function slugify(str: string) {
  return str.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** État d'envoi d'un canal de notification (email / SMS) renvoyé par l'API. */
type NotifyChannel = {
  status: "SENT" | "SKIPPED" | "FAILED";
  to: string | null;
  error?: string;
};
type Notifications = { email: NotifyChannel; sms: NotifyChannel } | null;

export default function CreateTenantModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (tenant: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  /**
   * Point de départ des visuels du portail (booléen envoyé à l'API) :
   *   false (défaut) → visuels neutres (placeholders) à personnaliser ;
   *   true           → configuration actuelle (photos de l'agence de référence).
   */
  const [useTemplateConfig, setUseTemplateConfig] = useState(false);
  /** Renseigné après création : récapitulatif + état des notifications envoyées. */
  const [done, setDone] = useState<{
    tenant: Record<string, unknown>;
    notifications: Notifications;
    /** Adresse du portail public de l'agence (pèlerins). */
    publicUrl: string | null;
    /** Adresse de l'espace de gestion (admin). */
    loginUrl: string | null;
    /** Visuels effectivement appliqués au portail. */
    assetMode: PortalAssetMode | null;
  } | null>(null);

  function setField(field: keyof FormData, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-slug depuis le nom
      if (field === "name") next.slug = slugify(value);
      // Auto-email admin depuis email agence
      if (field === "email" && !prev.adminEmail) next.adminEmail = value;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name || !form.slug || !form.email || !form.adminName || !form.adminEmail || !form.adminPassword) {
      setError("Tous les champs obligatoires (*) doivent être remplis.");
      return;
    }
    if (form.adminPassword.length < 8) {
      setError("Le mot de passe admin doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, useTemplateConfig }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la création");
        return;
      }
      // On affiche d'abord le récapitulatif — dont l'état des notifications
      // (email / SMS) et les DEUX adresses de l'agence (portail public + gestion),
      // renvoyées par l'API. La liste est rafraîchie quand le superadmin ferme le
      // récapitulatif (« Terminer »).
      setDone({
        tenant: data.tenant,
        notifications: (data.notifications ?? null) as Notifications,
        publicUrl: typeof data.publicUrl === "string" ? data.publicUrl : null,
        loginUrl: typeof data.loginUrl === "string" ? data.loginUrl : null,
        assetMode:
          data.assetMode === "TEMPLATE" || data.assetMode === "PLACEHOLDER"
            ? (data.assetMode as PortalAssetMode)
            : null,
      });
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-xl my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-700">
          <div>
            <h2 className="text-white font-bold text-lg">Nouvelle Agence</h2>
            <p className="text-gray-400 text-sm">Créer un compte agence et son administrateur</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 flex items-center justify-center transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {done && (
          <div className="px-6 py-5 space-y-5">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3.5">
              <p className="text-green-400 text-sm font-bold">Agence créée ✓</p>
              <p className="text-gray-300 text-sm mt-1">
                {String(done.tenant.name)} — ces deux adresses ont été transmises à l&apos;agence
                (email, et SMS au Niger) :
              </p>
            </div>

            <div className="space-y-2">
              <UrlRow label="Portail public (pèlerins)" url={done.publicUrl} />
              <UrlRow label="Espace de gestion (admin)" url={done.loginUrl} />
            </div>

            <div className="space-y-3">
              <NotifyLine icon="✉️" label="Email à l'agence" res={done.notifications?.email ?? null} />
              <NotifyLine icon="📱" label="SMS à l'agence" res={done.notifications?.sms ?? null} />
            </div>

            {done.assetMode && (
              <p className="text-xs text-gray-400 leading-relaxed">
                🖼️ Visuels du portail :{" "}
                <span className="text-gray-200">{ASSET_MODE_LABEL[done.assetMode]}</span>
                {done.assetMode === "PLACEHOLDER" &&
                  " — l'agence les remplace dans Personnalisation → Médias."}
              </p>
            )}

            <button
              type="button"
              onClick={() => onCreated(done.tenant)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-bold transition-colors"
            >
              Terminer
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`px-6 py-5 space-y-6 ${done ? "hidden" : ""}`}
        >

          {/* Section agence */}
          <div>
            <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
              Informations de l&apos;agence
            </h3>
            <div className="space-y-4">
              {/* Nom + slug */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1.5">
                    Nom de l&apos;agence *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="ZAM Hajj & Oumra"
                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-xl px-3 py-2.5 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1.5">
                    Slug (identifiant URL) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">/</span>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => setField("slug", slugify(e.target.value))}
                      placeholder="zam"
                      className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-xl pl-6 pr-3 py-2.5 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Email + Téléphone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="contact@agence.com"
                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-xl px-3 py-2.5 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1.5">Téléphone</label>
                  <PhoneInput
                    value={form.phone}
                    onChange={(e164) => setField("phone", e164)}
                    dark
                    className="w-full"
                  />
                </div>
              </div>

              {/* Pays + Plan */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1.5">Pays</label>
                  <select
                    value={form.country}
                    onChange={(e) => setField("country", e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1.5">Plan</label>
                  <select
                    value={form.plan}
                    onChange={(e) => setField("plan", e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
                  >
                    <option value="STARTER">Starter</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-1.5">Adresse</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  placeholder="Niamey, Niger"
                  className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-xl px-3 py-2.5 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <div className="border-t border-gray-700" />

          {/* Visuels du portail — booléen de point de départ */}
          <div>
            <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
              Visuels du portail
            </h3>
            <label className="flex items-start gap-3 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3.5 cursor-pointer hover:border-gray-500 transition-colors">
              <input
                type="checkbox"
                checked={useTemplateConfig}
                onChange={(e) => setUseTemplateConfig(e.target.checked)}
                className="mt-0.5 w-4 h-4 flex-shrink-0 accent-amber-500"
              />
              <span className="text-sm">
                <span className="block text-white font-semibold">
                  Utiliser la configuration actuelle
                </span>
                <span className="block text-gray-400 text-xs mt-1 leading-relaxed">
                  Reprend les photos de l&apos;agence de référence (rendu actuel des portails).
                  Décoché, l&apos;agence démarre avec des <strong>visuels neutres</strong>
                  qu&apos;elle remplace dans Personnalisation → Médias.
                </span>
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Dans les deux cas, le logo par défaut est celui de la plateforme (hajj-e.com) :
              l&apos;agence met le sien dans Personnalisation → Logo &amp; contact.
            </p>
          </div>

          {/* Section admin */}
          <div>
            <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
              Compte administrateur
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-1.5">Nom complet *</label>
                <input
                  type="text"
                  value={form.adminName}
                  onChange={(e) => setField("adminName", e.target.value)}
                  placeholder="Prénom Nom"
                  className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-xl px-3 py-2.5 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1.5">Email admin *</label>
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setField("adminEmail", e.target.value)}
                    placeholder="admin@agence.com"
                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-xl px-3 py-2.5 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1.5">
                    Mot de passe * <span className="text-gray-600 font-normal">(min. 8 car.)</span>
                  </label>
                  <input
                    type="password"
                    value={form.adminPassword}
                    onChange={(e) => setField("adminPassword", e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-900 border border-gray-600 text-white text-sm rounded-xl px-3 py-2.5 placeholder-gray-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-300 text-sm font-medium hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-gray-900 text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Création…
                </>
              ) : (
                "Créer l'agence"
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

/**
 * Ligne d'état d'un canal de notification après création d'une agence :
 *   ✓ envoyé à <destinataire> · ⚠ non envoyé (raison) · ✕ échec (raison)
 */
function NotifyLine({
  icon,
  label,
  res,
}: {
  icon: string;
  label: string;
  res: NotifyChannel | null;
}) {
  if (!res) {
    return (
      <p className="text-xs text-gray-500">
        {icon} {label} : aucune notification (réponse du serveur incomplète)
      </p>
    );
  }
  const tone =
    res.status === "SENT"
      ? "text-green-400"
      : res.status === "FAILED"
        ? "text-red-400"
        : "text-amber-400";
  const mark = res.status === "SENT" ? "✓" : res.status === "FAILED" ? "✕" : "⚠";
  return (
    <p className={`text-xs ${tone} leading-relaxed`}>
      {icon} {label} : {mark} {res.status === "SENT" ? `envoyé à ${res.to}` : (res.error ?? "non envoyé")}
    </p>
  );
}

/**
 * Adresse de l'agence (portail public / espace de gestion) avec copie en un clic.
 * Affichée après création pour que le superadmin puisse la partager lui-même.
 */
function UrlRow({ label, url }: { label: string; url: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!url) return null;

  return (
    <div className="flex items-center gap-2 bg-gray-900/60 border border-gray-700 rounded-xl px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
        <p className="text-sm text-white truncate" dir="ltr" title={url}>
          {url}
        </p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Presse-papiers indisponible (contexte non sécurisé, permission) :
            // l'adresse reste sélectionnable à la main.
          }
        }}
        className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-700 text-gray-300 text-xs font-semibold hover:bg-gray-600 transition-colors"
      >
        {copied ? "Copié ✓" : "Copier"}
      </button>
    </div>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
