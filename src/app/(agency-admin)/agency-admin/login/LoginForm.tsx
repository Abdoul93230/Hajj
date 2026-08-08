"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AgencyLoginForm({
  defaultTenantSlug,
  isDev,
}: {
  defaultTenantSlug: string;
  isDev: boolean;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(defaultTenantSlug);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, tenantSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur de connexion"); return; }
      if (!["AGENCY_ADMIN", "AGENCY_AGENT"].includes(data.role)) {
        setError("Accès non autorisé pour cet espace");
        return;
      }
      router.push("/agency-admin");
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">

      {/* Champ agence — visible uniquement en dev (en prod le slug vient du subdomain) */}
      {isDev && (
        <div>
          <label className="block text-gray-700 text-sm font-medium mb-1.5">
            Identifiant agence
            <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
              dev
            </span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().trim())}
            required
            className="w-full border border-amber-200 bg-amber-50 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400 font-mono"
            placeholder="zam, barakah…"
          />
        </div>
      )}

      <div>
        <label className="block text-gray-700 text-sm font-medium mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
          placeholder="vous@agence.com"
        />
      </div>
      <div>
        <label className="block text-gray-700 text-sm font-medium mb-1.5">Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-50"
      >
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
