"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SmsPlatformStats, SmsRange, TenantSmsStat } from "@/lib/sms-service";

type ApiPayload = SmsPlatformStats & {
  credits: number | null;
  creditsError: string | null;
  configured: boolean;
  sender: string;
  updatedAt: string;
};

const RANGES: { key: SmsRange; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "all", label: "Tout" },
];

const POLL_MS = 10_000;

export default function SmsMonitorClient({
  initialStats,
  initialRange,
  sender,
  configured,
}: {
  initialStats: SmsPlatformStats;
  initialRange: SmsRange;
  sender: string;
  configured: boolean;
}) {
  const [range, setRange] = useState<SmsRange>(initialRange);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ApiPayload>({
    ...initialStats,
    credits: null,
    creditsError: null,
    configured,
    sender,
    updatedAt: new Date().toISOString(),
  });
  const [live, setLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failures, setFailures] = useState(0);

  const load = useCallback(async (nextRange: SmsRange, nextSearch: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: nextRange });
      if (nextSearch.trim()) params.set("q", nextSearch.trim());
      const res = await fetch(`/api/superadmin/messages?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch failed");
      setData((await res.json()) as ApiPayload);
      setFailures(0);
    } catch {
      setFailures((count) => count + 1);
    } finally {
      setLoading(false);
    }
  }, []);

  // Temps réel : polling tant que l'utilisateur ne met pas en pause
  useEffect(() => {
    const interval = setInterval(() => {
      if (live && failures < 3) void load(range, search);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [live, failures, range, search, load]);

  // Rechargement au changement de filtre (léger debounce sur la recherche)
  useEffect(() => {
    const timeout = setTimeout(() => void load(range, search), 400);
    return () => clearTimeout(timeout);
  }, [range, search, load]);

  const totals = data.totals;
  const lastUpdate = useMemo(
    () => new Date(data.updatedAt).toLocaleTimeString("fr-FR"),
    [data.updatedAt]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Suivi SMS</h1>
          <p className="mt-1 text-sm text-gray-400">
            Consommation de toutes les agences · expéditeur{" "}
            <span className="font-semibold text-amber-400">{data.sender}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLive((value) => !value)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              live
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-gray-700 bg-gray-800 text-gray-400"
            }`}
          >
            {live ? `● Temps réel (${POLL_MS / 1000} s)` : "○ En pause"}
          </button>
          <button
            type="button"
            onClick={() => void load(range, search)}
            disabled={loading}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:text-white disabled:opacity-50"
          >
            {loading ? "Actualisation…" : "Actualiser"}
          </button>
        </div>
      </div>

      {!data.configured && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          L&apos;envoi de SMS n&apos;est pas configuré sur cet environnement.
        </div>
      )}
      {failures >= 3 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Actualisation interrompue après plusieurs échecs réseau. Utilisez « Actualiser ».
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Aujourd'hui" value={data.today.sent} sub={`${data.today.failed} échec(s)`} />
        <Stat label="Période" value={totals.sent} sub={`${totals.segments} SMS facturé(s)`} />
        <Stat
          label="Agences actives"
          value={totals.tenants}
          sub={`${totals.accounts} compte · ${totals.payments} versement`}
        />
        <Stat
          label="Crédits opérateur"
          value={data.credits ?? "—"}
          sub={data.creditsError ? "indisponible" : "LAfricaMobile"}
          tone={data.creditsError ? "warn" : undefined}
        />
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 px-6 py-4">
          <h2 className="font-semibold text-white">Par agence</h2>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-gray-700">
              {RANGES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setRange(item.key)}
                  className={`px-3 py-1.5 text-xs font-medium ${
                    range === item.key
                      ? "bg-amber-500/15 text-amber-400"
                      : "bg-gray-900 text-gray-400 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher une agence…"
              className="w-48 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-6 py-3">Agence</th>
                <th className="px-6 py-3">Envoyés</th>
                <th className="px-6 py-3">Échecs</th>
                <th className="px-6 py-3">Sans numéro</th>
                <th className="px-6 py-3">Compte / Versement / Manuel</th>
                <th className="px-6 py-3">Dernier envoi</th>
              </tr>
            </thead>
            <tbody>
              {data.byTenant.map((row) => (
                <TenantRow key={row.tenantId} row={row} />
              ))}
              {!data.byTenant.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    Aucune agence trouvée.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t border-gray-700 text-white">
              <tr>
                <td className="px-6 py-4 font-semibold">Total</td>
                <td className="px-6 py-4 font-semibold">{totals.sent}</td>
                <td className="px-6 py-4 text-red-400">{totals.failed}</td>
                <td className="px-6 py-4 text-amber-400">{totals.skipped}</td>
                <td className="px-6 py-4 text-gray-400">
                  {totals.accounts} / {totals.payments} / {totals.manual}
                </td>
                <td className="px-6 py-4 text-gray-400">{formatDate(totals.lastSentAt)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="border-t border-gray-700 px-6 py-3 text-xs text-gray-500">
          Dernière mise à jour : {lastUpdate}
          {live && " · actualisation automatique"}
        </p>
      </div>
    </div>
  );
}
// ── Sous-composants ──────────────────────────────────────────────────────────

function TenantRow({ row }: { row: TenantSmsStat }) {
  const activity = row.sent + row.failed + row.skipped;
  const successRate = activity ? Math.round((row.sent / activity) * 100) : 0;

  return (
    <tr className="border-t border-gray-700/60 hover:bg-gray-900/40">
      <td className="px-6 py-3">
        <div className="font-medium text-white">{row.tenantName}</div>
        <div className="text-xs text-gray-500">
          {row.tenantSlug} · {activity ? `${successRate} % de réussite` : "aucun envoi"}
        </div>
      </td>
      <td className="px-6 py-3 font-semibold text-white">{row.sent}</td>
      <td className="px-6 py-3 text-red-400">{row.failed || "—"}</td>
      <td className="px-6 py-3 text-amber-400">{row.skipped || "—"}</td>
      <td className="px-6 py-3 text-gray-400">
        <span className="text-blue-300">{row.bySource.ACCOUNT ?? 0}</span> /{" "}
        <span className="text-purple-300">{row.bySource.PAYMENT ?? 0}</span> /{" "}
        <span className="text-gray-300">{row.bySource.MANUAL ?? 0}</span>
      </td>
      <td className="px-6 py-3 text-gray-400">{formatDate(row.lastSentAt)}</td>
    </tr>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "warn" | "error";
}) {
  const valueTone =
    tone === "error" ? "text-red-400" : tone === "warn" ? "text-amber-400" : "text-white";

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueTone}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
