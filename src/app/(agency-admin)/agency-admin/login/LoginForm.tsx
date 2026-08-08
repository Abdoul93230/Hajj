"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AgencyLoginForm() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pas de tenantSlug → le serveur identifie l'agence depuis l'email
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur de connexion"); return; }
      if (!["AGENCY_ADMIN", "AGENCY_AGENT"].includes(data.role)) {
        setError("Accès non autorisé pour cet espace");
        return;
      }
      window.location.href = "/agency-admin";
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div>
        <label className="block text-gray-700 text-sm font-medium mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
          placeholder="vous@agence.com"
        />
      </div>
      <div>
        <label className="block text-gray-700 text-sm font-medium mb-1.5">Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
        />
      </div>
      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0f5132] hover:bg-[#0d4429] text-white font-semibold rounded-lg py-2.5 text-sm transition disabled:opacity-50"
      >
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
